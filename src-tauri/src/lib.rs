use std::collections::BTreeSet;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::thread;

use base64::Engine;
use reqwest::blocking::Client;
use serde::{Deserialize, Serialize};
use serde_json::{Map as JsonMap, Number as JsonNumber, Value as JsonValue};
use serde_yaml::Value as YamlValue;
use tauri::{
  menu::{MenuBuilder, MenuItemBuilder},
  tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
  Manager,
  State,
  WindowEvent,
};
use tiny_http::{Header, Method, Response, Server, StatusCode};
use vpn_link_serde::Protocol;

const LOCAL_SUBSCRIPTION_SERVICE_PORT: u16 = 16780;
const LOCAL_SUBSCRIPTIONS_PATH: &str = "/subscriptions";
const LOCAL_PROVIDERS_PATH: &str = "/providers";

struct LocalSubscriptionServiceState {
  service_dir: PathBuf,
  base_url: String,
}

fn normalize_subscription_target(target: &str) -> Result<String, String> {
  let trimmed = target.trim();
  if trimmed.is_empty() {
    return Err("the local subscription target cannot be empty".to_string());
  }

  if trimmed
    .chars()
    .all(|character| character.is_ascii_alphanumeric() || matches!(character, '-' | '_'))
  {
    return Ok(trimmed.to_string());
  }

  Err(format!("the local subscription target '{target}' contains unsupported characters"))
}

fn config_route_for_target(target: &str) -> String {
  format!("{LOCAL_SUBSCRIPTIONS_PATH}/{target}.yaml")
}

#[derive(Debug, Deserialize)]
struct SubscriptionInput {
  name: String,
  url: String,
}

#[derive(Debug, Serialize)]
struct ResolveSubscriptionsResponse {
  proxies: Vec<JsonValue>,
  warnings: Vec<String>,
}

#[derive(Debug, Serialize)]
struct DetectCfwCoreResponse {
  status: String,
  kernel: String,
  summary: String,
}

fn collect_running_processes() -> Result<Vec<String>, String> {
  #[cfg(target_os = "windows")]
  {
    let output = Command::new("tasklist")
      .args(["/FO", "CSV", "/NH"])
      .output()
      .map_err(|error| format!("failed to run tasklist: {error}"))?;

    if !output.status.success() {
      return Err("tasklist exited with a non-zero status".to_string());
    }

    let stdout =
      String::from_utf8(output.stdout).map_err(|error| format!("invalid tasklist output: {error}"))?;

    let mut names = BTreeSet::new();
    for line in stdout.lines() {
      let trimmed = line.trim();
      if trimmed.is_empty() {
        continue;
      }

      let first_field = trimmed
        .trim_matches('"')
        .split("\",\"")
        .next()
        .unwrap_or("")
        .trim()
        .to_string();

      if !first_field.is_empty() {
        names.insert(first_field);
      }
    }

    return Ok(names.into_iter().collect());
  }

  #[cfg(not(target_os = "windows"))]
  {
    Ok(Vec::new())
  }
}

fn push_string_field(output: &mut JsonMap<String, JsonValue>, key: &str, value: Option<String>) {
  if let Some(value) = value.filter(|value| !value.is_empty()) {
    output.insert(key.to_string(), JsonValue::String(value));
  }
}

fn push_bool_field(output: &mut JsonMap<String, JsonValue>, key: &str, value: Option<bool>) {
  if let Some(value) = value {
    output.insert(key.to_string(), JsonValue::Bool(value));
  }
}

fn push_u64_field(output: &mut JsonMap<String, JsonValue>, key: &str, value: Option<u64>) {
  if let Some(value) = value {
    output.insert(key.to_string(), JsonValue::Number(JsonNumber::from(value)));
  }
}

fn first_string(value: &JsonValue, keys: &[&str]) -> Option<String> {
  let object = value.as_object()?;
  keys
    .iter()
    .find_map(|key| object.get(*key)?.as_str().map(|item| item.to_string()))
}

fn first_u64(value: &JsonValue, keys: &[&str]) -> Option<u64> {
  let object = value.as_object()?;
  keys.iter().find_map(|key| match object.get(*key) {
    Some(JsonValue::Number(number)) => number.as_u64(),
    Some(JsonValue::String(raw)) => raw.parse::<u64>().ok(),
    _ => None,
  })
}

fn first_bool(value: &JsonValue, keys: &[&str]) -> Option<bool> {
  let object = value.as_object()?;
  keys.iter().find_map(|key| match object.get(*key) {
    Some(JsonValue::Bool(value)) => Some(*value),
    Some(JsonValue::String(raw)) => match raw.to_ascii_lowercase().as_str() {
      "true" | "1" => Some(true),
      "false" | "0" => Some(false),
      _ => None,
    },
    _ => None,
  })
}

fn decode_subscription_payload(raw: &str) -> String {
  let trimmed = raw.trim();
  if trimmed.contains("://") {
    return trimmed.to_string();
  }

  let compact = trimmed.lines().map(str::trim).collect::<String>();
  let candidates = [
    base64::engine::general_purpose::STANDARD.decode(compact.as_bytes()),
    base64::engine::general_purpose::STANDARD_NO_PAD.decode(compact.as_bytes()),
    base64::engine::general_purpose::URL_SAFE.decode(compact.as_bytes()),
    base64::engine::general_purpose::URL_SAFE_NO_PAD.decode(compact.as_bytes()),
  ];

  for candidate in candidates {
    if let Ok(bytes) = candidate {
      if let Ok(decoded) = String::from_utf8(bytes) {
        let text = decoded.trim();
        if text.contains("://") {
          return text.to_string();
        }
      }
    }
  }

  trimmed.to_string()
}

fn normalize_proxy_name(base_name: String, used_names: &mut BTreeSet<String>) -> String {
  let normalized = if base_name.trim().is_empty() {
    "Proxy".to_string()
  } else {
    base_name
  };

  if used_names.insert(normalized.clone()) {
    return normalized;
  }

  let mut index = 2usize;
  loop {
    let candidate = format!("{normalized} {index}");
    if used_names.insert(candidate.clone()) {
      return candidate;
    }
    index += 1;
  }
}

fn derive_proxy_name(config: &JsonValue, fallback: &str, line_index: usize) -> String {
  first_string(config, &["ps", "name", "remark", "remarks", "tag"])
    .filter(|value| !value.trim().is_empty())
    .unwrap_or_else(|| format!("{fallback}-{line_index}"))
}

fn build_ws_opts(config: &JsonValue) -> Option<JsonValue> {
  let path = first_string(config, &["path"]);
  let host = first_string(config, &["host", "serverName", "servername"]);

  if path.is_none() && host.is_none() {
    return None;
  }

  let mut ws_opts = JsonMap::new();
  push_string_field(&mut ws_opts, "path", path);
  if let Some(host) = host {
    let mut headers = JsonMap::new();
    headers.insert("Host".to_string(), JsonValue::String(host));
    ws_opts.insert("headers".to_string(), JsonValue::Object(headers));
  }

  Some(JsonValue::Object(ws_opts))
}

fn build_grpc_opts(config: &JsonValue) -> Option<JsonValue> {
  let service_name = first_string(config, &["serviceName", "service_name", "path"]);
  service_name.map(|service_name| {
    let mut output = JsonMap::new();
    output.insert(
      "grpc-service-name".to_string(),
      JsonValue::String(service_name),
    );
    JsonValue::Object(output)
  })
}

fn build_http_opts(config: &JsonValue) -> Option<JsonValue> {
  let path = first_string(config, &["path"]);
  let host = first_string(config, &["host", "serverName", "servername"]);

  if path.is_none() && host.is_none() {
    return None;
  }

  let mut output = JsonMap::new();
  if let Some(path) = path {
    output.insert("path".to_string(), JsonValue::Array(vec![JsonValue::String(path)]));
  }
  if let Some(host) = host {
    let mut headers = JsonMap::new();
    headers.insert("Host".to_string(), JsonValue::Array(vec![JsonValue::String(host)]));
    output.insert("headers".to_string(), JsonValue::Object(headers));
  }

  Some(JsonValue::Object(output))
}

fn build_reality_opts(config: &JsonValue) -> Option<JsonValue> {
  let public_key = first_string(config, &["pbk", "publicKey", "public-key"]);
  let short_id = first_string(config, &["sid", "shortId", "short-id"]);

  if public_key.is_none() && short_id.is_none() {
    return None;
  }

  let mut output = JsonMap::new();
  push_string_field(&mut output, "public-key", public_key);
  push_string_field(&mut output, "short-id", short_id);
  Some(JsonValue::Object(output))
}

fn protocol_to_clash_proxy(
  protocol: Protocol,
  fallback_name: &str,
  line_index: usize,
  used_names: &mut BTreeSet<String>,
) -> Option<JsonValue> {
  match protocol {
    Protocol::VMess(item) => {
      let config = serde_json::to_value(item.config).ok()?;
      let mut output = JsonMap::new();
      let name = normalize_proxy_name(derive_proxy_name(&config, fallback_name, line_index), used_names);
      output.insert("name".to_string(), JsonValue::String(name));
      output.insert("type".to_string(), JsonValue::String("vmess".to_string()));
      push_string_field(&mut output, "server", first_string(&config, &["add", "address", "server"]));
      push_u64_field(&mut output, "port", first_u64(&config, &["port"]));
      push_string_field(&mut output, "uuid", first_string(&config, &["id", "uuid"]));
      push_u64_field(&mut output, "alterId", first_u64(&config, &["aid", "alterId"]));
      push_string_field(
        &mut output,
        "cipher",
        first_string(&config, &["scy", "cipher"]).or_else(|| Some("auto".to_string())),
      );
      push_bool_field(&mut output, "udp", Some(true));

      let network = first_string(&config, &["net", "network"]);
      push_string_field(&mut output, "network", network.clone());

      let tls = first_string(&config, &["tls", "security"])
        .map(|value| !matches!(value.to_ascii_lowercase().as_str(), "" | "false" | "none"));
      push_bool_field(&mut output, "tls", tls);
      push_string_field(&mut output, "servername", first_string(&config, &["sni", "servername"]));
      push_string_field(&mut output, "client-fingerprint", first_string(&config, &["fp"]));

      match network.as_deref() {
        Some("ws") => {
          if let Some(ws_opts) = build_ws_opts(&config) {
            output.insert("ws-opts".to_string(), ws_opts);
          }
        }
        Some("grpc") => {
          if let Some(grpc_opts) = build_grpc_opts(&config) {
            output.insert("grpc-opts".to_string(), grpc_opts);
          }
        }
        Some("http") | Some("h2") => {
          if let Some(http_opts) = build_http_opts(&config) {
            output.insert("http-opts".to_string(), http_opts);
          }
        }
        _ => {}
      }

      Some(JsonValue::Object(output))
    }
    Protocol::VLess(item) => {
      let config = serde_json::to_value(item.config).ok()?;
      let mut output = JsonMap::new();
      let name = normalize_proxy_name(derive_proxy_name(&config, fallback_name, line_index), used_names);
      output.insert("name".to_string(), JsonValue::String(name));
      output.insert("type".to_string(), JsonValue::String("vless".to_string()));
      push_string_field(&mut output, "server", first_string(&config, &["address", "server", "host"]));
      push_u64_field(&mut output, "port", first_u64(&config, &["port"]));
      push_string_field(&mut output, "uuid", first_string(&config, &["id", "uuid"]));
      push_bool_field(&mut output, "udp", Some(true));
      push_string_field(&mut output, "flow", first_string(&config, &["flow"]));
      push_string_field(&mut output, "servername", first_string(&config, &["sni", "servername"]));
      push_string_field(&mut output, "client-fingerprint", first_string(&config, &["fp"]));

      let security = first_string(&config, &["security", "tls"]);
      let tls = security
        .as_deref()
        .map(|value| !matches!(value, "" | "false" | "none"));
      push_bool_field(&mut output, "tls", tls);

      let network = first_string(&config, &["type", "network"]);
      push_string_field(&mut output, "network", network.clone());

      if matches!(security.as_deref(), Some("reality")) {
        if let Some(reality_opts) = build_reality_opts(&config) {
          output.insert("reality-opts".to_string(), reality_opts);
        }
      }

      match network.as_deref() {
        Some("ws") => {
          if let Some(ws_opts) = build_ws_opts(&config) {
            output.insert("ws-opts".to_string(), ws_opts);
          }
        }
        Some("grpc") => {
          if let Some(grpc_opts) = build_grpc_opts(&config) {
            output.insert("grpc-opts".to_string(), grpc_opts);
          }
        }
        Some("http") | Some("h2") => {
          if let Some(http_opts) = build_http_opts(&config) {
            output.insert("http-opts".to_string(), http_opts);
          }
        }
        _ => {}
      }

      Some(JsonValue::Object(output))
    }
    Protocol::Trojan(item) => {
      let config = serde_json::to_value(item.config).ok()?;
      let mut output = JsonMap::new();
      let name = normalize_proxy_name(derive_proxy_name(&config, fallback_name, line_index), used_names);
      output.insert("name".to_string(), JsonValue::String(name));
      output.insert("type".to_string(), JsonValue::String("trojan".to_string()));
      push_string_field(&mut output, "server", first_string(&config, &["address", "server", "host"]));
      push_u64_field(&mut output, "port", first_u64(&config, &["port"]));
      push_string_field(&mut output, "password", first_string(&config, &["password"]));
      push_bool_field(&mut output, "udp", Some(true));
      push_string_field(&mut output, "sni", first_string(&config, &["sni", "servername"]));
      push_bool_field(&mut output, "skip-cert-verify", first_bool(&config, &["allowInsecure", "insecure"]));

      let network = first_string(&config, &["type", "network"]);
      push_string_field(&mut output, "network", network.clone());

      match network.as_deref() {
        Some("ws") => {
          if let Some(ws_opts) = build_ws_opts(&config) {
            output.insert("ws-opts".to_string(), ws_opts);
          }
        }
        Some("grpc") => {
          if let Some(grpc_opts) = build_grpc_opts(&config) {
            output.insert("grpc-opts".to_string(), grpc_opts);
          }
        }
        _ => {}
      }

      Some(JsonValue::Object(output))
    }
    Protocol::Shadowsocks(item) => {
      let config = serde_json::to_value(item.config).ok()?;
      let mut output = JsonMap::new();
      let name = normalize_proxy_name(derive_proxy_name(&config, fallback_name, line_index), used_names);
      output.insert("name".to_string(), JsonValue::String(name));
      output.insert("type".to_string(), JsonValue::String("ss".to_string()));
      push_string_field(&mut output, "server", first_string(&config, &["address", "server", "host"]));
      push_u64_field(&mut output, "port", first_u64(&config, &["port"]));
      push_string_field(&mut output, "cipher", first_string(&config, &["method", "cipher"]));
      push_string_field(&mut output, "password", first_string(&config, &["password"]));
      push_bool_field(&mut output, "udp", Some(true));
      push_string_field(&mut output, "plugin", first_string(&config, &["plugin"]));
      push_string_field(
        &mut output,
        "plugin-opts",
        first_string(&config, &["plugin_opts", "plugin-opts"]),
      );
      Some(JsonValue::Object(output))
    }
    Protocol::Hysteria2(item) => {
      let config = serde_json::to_value(item.config).ok()?;
      let mut output = JsonMap::new();
      let name = normalize_proxy_name(derive_proxy_name(&config, fallback_name, line_index), used_names);
      output.insert("name".to_string(), JsonValue::String(name));
      output.insert("type".to_string(), JsonValue::String("hysteria2".to_string()));
      push_string_field(&mut output, "server", first_string(&config, &["host", "address", "server"]));
      push_u64_field(&mut output, "port", first_u64(&config, &["port"]));
      push_string_field(&mut output, "password", first_string(&config, &["password", "auth"]));
      push_string_field(&mut output, "sni", first_string(&config, &["sni", "servername"]));
      push_bool_field(&mut output, "skip-cert-verify", first_bool(&config, &["insecure"]));
      push_string_field(&mut output, "obfs", first_string(&config, &["obfs"]));
      push_string_field(
        &mut output,
        "obfs-password",
        first_string(&config, &["obfs-password", "obfs_password"]),
      );
      Some(JsonValue::Object(output))
    }
  }
}

fn parse_yaml_proxies(text: &str, used_names: &mut BTreeSet<String>) -> Option<Vec<JsonValue>> {
  let parsed = serde_yaml::from_str::<YamlValue>(text).ok()?;
  let proxies = parsed.get("proxies")?.as_sequence()?;
  let mut output = Vec::new();

  for item in proxies {
    let json_value = serde_json::to_value(item).ok()?;
    if let Some(object) = json_value.as_object() {
      let mut normalized = object.clone();
      if let Some(name) = normalized.get("name").and_then(JsonValue::as_str) {
        let unique_name = normalize_proxy_name(name.to_string(), used_names);
        normalized.insert("name".to_string(), JsonValue::String(unique_name));
      }
      output.push(JsonValue::Object(normalized));
    }
  }

  Some(output)
}

fn parse_subscription_text(
  subscription_name: &str,
  text: &str,
  used_names: &mut BTreeSet<String>,
) -> (Vec<JsonValue>, Vec<String>) {
  if let Some(proxies) = parse_yaml_proxies(text, used_names) {
    return (proxies, Vec::new());
  }

  let normalized = decode_subscription_payload(text);
  let mut proxies = Vec::new();
  let mut warnings = Vec::new();

  for (index, line) in normalized.lines().enumerate() {
    let candidate = line.trim();
    if candidate.is_empty() || candidate.starts_with('#') {
      continue;
    }

    match Protocol::parse(candidate) {
      Ok(protocol) => {
        if let Some(proxy) =
          protocol_to_clash_proxy(protocol, subscription_name, index + 1, used_names)
        {
          proxies.push(proxy);
        } else {
          warnings.push(format!("Unsupported link was skipped: {candidate}"));
        }
      }
      Err(_) => warnings.push(format!("Could not parse link: {candidate}")),
    }
  }

  (proxies, warnings)
}

fn read_saved_service_project(service_dir: &Path) -> Result<JsonValue, String> {
  let raw = fs::read_to_string(service_dir.join("source-project.json"))
    .map_err(|error| format!("failed to read the saved service project: {error}"))?;

  serde_json::from_str(&raw)
    .map_err(|error| format!("failed to parse the saved service project: {error}"))
}

fn service_target_dir(service_dir: &Path, target: &str) -> PathBuf {
  service_dir.join(target)
}

fn read_saved_service_config(service_dir: &Path) -> Result<String, String> {
  fs::read_to_string(service_dir.join("config.yaml"))
    .map_err(|error| format!("failed to read the saved local subscription config: {error}"))
}

fn build_local_service_response(
  status_code: u16,
  content_type: &str,
  body: impl Into<Vec<u8>>,
) -> Response<std::io::Cursor<Vec<u8>>> {
  let mut response = Response::from_data(body.into()).with_status_code(StatusCode(status_code));

  if let Ok(header) = Header::from_bytes(b"Content-Type".as_slice(), content_type.as_bytes()) {
    response = response.with_header(header);
  }

  if let Ok(header) = Header::from_bytes(b"Cache-Control".as_slice(), b"no-cache".as_slice()) {
    response = response.with_header(header);
  }

  response
}

fn write_local_service_error(
  request: tiny_http::Request,
  status_code: u16,
  message: String,
) {
  let _ = request.respond(build_local_service_response(
    status_code,
    "text/plain; charset=utf-8",
    message,
  ));
}

fn build_local_provider_yaml(service_dir: &Path, provider_id: &str) -> Result<String, String> {
  let project = read_saved_service_project(service_dir)?;
  let provider = project
    .get("proxyProviders")
    .and_then(JsonValue::as_array)
    .and_then(|providers| {
      providers.iter().find(|provider| {
        provider
          .get("id")
          .and_then(JsonValue::as_str)
          .map(|id| id == provider_id)
          .unwrap_or(false)
      })
    })
    .ok_or_else(|| format!("No proxy-provider with id '{provider_id}' was found."))?;

  let provider_name = provider
    .get("name")
    .and_then(JsonValue::as_str)
    .unwrap_or("subscription");
  let url = provider
    .get("url")
    .and_then(JsonValue::as_str)
    .ok_or_else(|| format!("Proxy-provider '{provider_name}' does not have a source URL."))?;

  let client = Client::builder()
    .user_agent("clash-yaml-builder/0.2.3")
    .build()
    .map_err(|error| format!("failed to build HTTP client: {error}"))?;

  let response = client
    .get(url)
    .send()
    .and_then(|response| response.error_for_status())
    .map_err(|error| format!("failed to fetch {provider_name}: {error}"))?;

  let text = response
    .text()
    .map_err(|error| format!("failed to read {provider_name}: {error}"))?;

  let mut used_names = BTreeSet::new();
  let (proxies, _warnings) = parse_subscription_text(provider_name, &text, &mut used_names);
  if proxies.is_empty() {
    return Err(format!(
      "No usable proxy nodes were found in '{provider_name}'."
    ));
  }

  serde_yaml::to_string(&serde_json::json!({ "proxies": proxies }))
    .map_err(|error| format!("failed to serialize proxy-provider YAML: {error}"))
}

fn handle_local_service_request(request: tiny_http::Request, service_dir: &Path) {
  if request.method() != &Method::Get {
    write_local_service_error(
      request,
      405,
      "Only GET requests are supported by the local subscription service.".to_string(),
    );
    return;
  }

  let request_path = request.url().split('?').next().unwrap_or("/").to_string();

  if let Some(config_path) = request_path.strip_prefix(LOCAL_SUBSCRIPTIONS_PATH) {
    if let Some(target) = config_path.strip_prefix('/').and_then(|value| value.strip_suffix(".yaml"))
    {
      let target_dir = service_target_dir(service_dir, target);
      match read_saved_service_config(&target_dir) {
        Ok(config_yaml) => {
          let _ = request.respond(build_local_service_response(
            200,
            "text/yaml; charset=utf-8",
            config_yaml,
          ));
        }
        Err(error) => write_local_service_error(request, 500, error),
      }
      return;
    }
  }

  if let Some(provider_path) = request_path.strip_prefix(LOCAL_PROVIDERS_PATH) {
    if let Some(provider_path) = provider_path.strip_prefix('/') {
      let mut parts = provider_path.splitn(2, '/');
      let target = parts.next().unwrap_or_default();
      let provider_file = parts.next().unwrap_or_default();

      if let Some(encoded_id) = provider_file.strip_suffix(".yaml") {
        let decoded_id = urlencoding::decode(encoded_id)
          .map(|value| value.into_owned())
          .unwrap_or_else(|_| encoded_id.to_string());
        let target_dir = service_target_dir(service_dir, target);

        match build_local_provider_yaml(&target_dir, &decoded_id) {
          Ok(provider_yaml) => {
            let _ = request.respond(build_local_service_response(
              200,
              "text/yaml; charset=utf-8",
              provider_yaml,
            ));
          }
          Err(error) => write_local_service_error(request, 500, error),
        }
        return;
      }
    }
  }

  write_local_service_error(
    request,
    404,
    format!("The local subscription path '{request_path}' was not found."),
  );
}

fn start_local_subscription_service(service_dir: PathBuf) -> Result<(), String> {
  let address = format!("127.0.0.1:{LOCAL_SUBSCRIPTION_SERVICE_PORT}");
  let server = Server::http(&address)
    .map_err(|error| format!("failed to start the local subscription service: {error}"))?;

  thread::spawn(move || {
    for request in server.incoming_requests() {
      handle_local_service_request(request, &service_dir);
    }
  });

  Ok(())
}

#[tauri::command]
fn resolve_subscriptions_in_desktop(
  subscriptions: Vec<SubscriptionInput>,
) -> Result<ResolveSubscriptionsResponse, String> {
  let client = Client::builder()
    .user_agent("clash-yaml-builder/0.2.3")
    .build()
    .map_err(|error| format!("failed to build HTTP client: {error}"))?;

  let mut proxies = Vec::new();
  let mut warnings = Vec::new();
  let mut used_names = BTreeSet::new();

  for subscription in subscriptions {
    let url = subscription.url.trim();
    if url.is_empty() {
      continue;
    }

    let response = client
      .get(url)
      .send()
      .and_then(|response| response.error_for_status())
      .map_err(|error| format!("failed to fetch {}: {error}", subscription.name))?;

    let text = response
      .text()
      .map_err(|error| format!("failed to read {}: {error}", subscription.name))?;

    let (mut parsed, mut parsed_warnings) =
      parse_subscription_text(&subscription.name, &text, &mut used_names);
    proxies.append(&mut parsed);
    warnings.append(&mut parsed_warnings);
  }

  if proxies.is_empty() {
    return Err("No usable proxy nodes were found in the current subscription links.".to_string());
  }

  Ok(ResolveSubscriptionsResponse { proxies, warnings })
}

#[tauri::command]
fn list_running_processes() -> Result<Vec<String>, String> {
  Ok(collect_running_processes()?
    .into_iter()
    .filter(|name| name.ends_with(".exe"))
    .collect())
}

#[tauri::command]
fn detect_cfw_core() -> Result<DetectCfwCoreResponse, String> {
  let processes = collect_running_processes()?;
  let normalized: Vec<String> = processes
    .into_iter()
    .map(|name| name.to_ascii_lowercase())
    .collect();

  let has_cfw_shell = normalized.iter().any(|name| name == "clash for windows.exe");
  let has_mihomo = normalized
    .iter()
    .any(|name| name == "mihomo.exe" || name == "mihomo");
  let has_classic = normalized
    .iter()
    .any(|name| name == "clash-win64.exe" || name == "clash-win64");

  if has_cfw_shell && has_mihomo {
    return Ok(DetectCfwCoreResponse {
      status: "detected".to_string(),
      kernel: "mihomo".to_string(),
      summary: "The Windows Clash client is currently running with the Mihomo core.".to_string(),
    });
  }

  if has_cfw_shell && has_classic {
    return Ok(DetectCfwCoreResponse {
      status: "detected".to_string(),
      kernel: "classic".to_string(),
      summary: "The Windows Clash client is currently running with the classic core.".to_string(),
    });
  }

  if has_cfw_shell {
    return Ok(DetectCfwCoreResponse {
      status: "unknown".to_string(),
      kernel: "unknown".to_string(),
      summary:
        "The Windows Clash client is running, but the current core could not be identified. Keep it open and try again."
          .to_string(),
    });
  }

  Ok(DetectCfwCoreResponse {
    status: "not_running".to_string(),
    kernel: "unknown".to_string(),
    summary:
      "The Windows Clash client does not appear to be running right now. Open it first, then try the detection again."
        .to_string(),
  })
}

#[tauri::command]
fn save_text_file(default_name: String, content: String) -> Result<String, String> {
  let Some(path) = rfd::FileDialog::new()
    .set_file_name(&default_name)
    .save_file() else {
      return Ok("cancelled".to_string());
    };

  fs::write(&path, content).map_err(|error| format!("failed to save file: {error}"))?;

  Ok(path.display().to_string())
}

#[tauri::command]
fn publish_local_subscription_service(
  target: String,
  source_project_json: String,
  config_yaml: String,
  state: State<LocalSubscriptionServiceState>,
) -> Result<String, String> {
  let normalized_target = normalize_subscription_target(&target)?;
  let target_dir = service_target_dir(&state.service_dir, &normalized_target);

  fs::create_dir_all(&target_dir)
    .map_err(|error| format!("failed to prepare the local service directory: {error}"))?;

  fs::write(target_dir.join("source-project.json"), source_project_json)
    .map_err(|error| format!("failed to save the source project for the local service: {error}"))?;
  fs::write(target_dir.join("config.yaml"), config_yaml)
    .map_err(|error| format!("failed to save the generated local subscription config: {error}"))?;

  Ok(format!("{}{}", state.base_url, config_route_for_target(&normalized_target)))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      let open_item = MenuItemBuilder::with_id("open_main", "打开主界面 / Open")
        .build(app)
        .map_err(|error| format!("failed to build tray menu item: {error}"))?;
      let quit_item = MenuItemBuilder::with_id("quit_app", "彻底退出 / Quit")
        .build(app)
        .map_err(|error| format!("failed to build tray menu item: {error}"))?;
      let tray_menu = MenuBuilder::new(app)
        .items(&[&open_item, &quit_item])
        .build()
        .map_err(|error| format!("failed to build the tray menu: {error}"))?;

      let tray_icon = app
        .default_window_icon()
        .cloned()
        .ok_or_else(|| "failed to load the default tray icon".to_string())?;

      let _tray = TrayIconBuilder::new()
        .icon(tray_icon)
        .tooltip("clash-yaml-builder")
        .menu(&tray_menu)
        .show_menu_on_left_click(false)
        .on_tray_icon_event(|tray, event| {
          if let TrayIconEvent::Click {
            button: MouseButton::Left,
            button_state: MouseButtonState::Up,
            ..
          } = event
          {
            let app = tray.app_handle();
            if let Some(window) = app.get_webview_window("main") {
              let _ = window.show();
              let _ = window.unminimize();
              let _ = window.set_focus();
            }
          }
        })
        .on_menu_event(|app, event| match event.id().as_ref() {
          "open_main" => {
            if let Some(window) = app.get_webview_window("main") {
              let _ = window.show();
              let _ = window.unminimize();
              let _ = window.set_focus();
            }
          }
          "quit_app" => {
            app.exit(0);
          }
          _ => {}
        })
        .build(app)
        .map_err(|error| format!("failed to create the tray icon: {error}"))?;

      let service_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("failed to resolve the app data directory: {error}"))?
        .join("local-subscription-service");

      fs::create_dir_all(&service_dir)
        .map_err(|error| format!("failed to prepare the local service directory: {error}"))?;

      app.manage(LocalSubscriptionServiceState {
        service_dir: service_dir.clone(),
        base_url: format!("http://127.0.0.1:{LOCAL_SUBSCRIPTION_SERVICE_PORT}"),
      });

      if let Err(error) = start_local_subscription_service(service_dir) {
        eprintln!("{error}");
      }

      Ok(())
    })
    .on_window_event(|window, event| {
      if window.label() != "main" {
        return;
      }

      if let WindowEvent::CloseRequested { api, .. } = event {
        api.prevent_close();
        let _ = window.hide();
      }
    })
    .invoke_handler(tauri::generate_handler![
      detect_cfw_core,
      list_running_processes,
      publish_local_subscription_service,
      resolve_subscriptions_in_desktop,
      save_text_file
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
