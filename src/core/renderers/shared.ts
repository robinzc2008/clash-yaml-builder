import YAML from "yaml";
import type {
  BuilderProject,
  GeoDataSourceId,
  GroupMember,
  GroupSpec,
  PolicyRef,
  ProxyProviderSpec,
  RuleProviderSpec,
  RuleSpec,
} from "../model/types";
import { buildGeoxUrlConfig } from "../sources/loyalsoldierSource";

export function resolvePolicy(policy: PolicyRef): string {
  return policy.kind === "builtin" ? policy.value : policy.value;
}

export function renderGroupMember(member: GroupMember, project: BuilderProject): string {
  switch (member.kind) {
    case "builtin":
      return member.value;
    case "group": {
      const group = project.groups.find(
        (item) => item.id === member.ref || item.name === member.ref,
      );
      return group?.name ?? member.ref;
    }
    case "proxy-provider": {
      const provider = project.proxyProviders.find((item) => item.id === member.ref);
      return provider?.name ?? member.ref;
    }
    case "proxy":
      return member.value;
  }
}

/**
 * 把 GroupSpec 渲染成 Clash proxy-groups 条目。
 * 地区组用 include-all + filter，服务组用 proxies 列表。
 */
export function renderProxyGroup(
  group: GroupSpec,
  project: BuilderProject,
): Record<string, unknown> {
  if (group.includeAll) {
    const entry: Record<string, unknown> = {
      name: group.name,
      type: group.type,
      "include-all": true,
    };
    if (group.filter) entry.filter = group.filter;
    if (group.tolerance) entry.tolerance = group.tolerance;
    if (group.testInterval) entry.interval = group.testInterval;
    return entry;
  }

  return {
    name: group.name,
    type: group.type,
    proxies: group.members.map((member) => renderGroupMember(member, project)),
  };
}

export function renderProxyProvider(
  provider: ProxyProviderSpec,
): Record<string, unknown> {
  const output: Record<string, unknown> = {
    type: provider.sourceType,
  };

  if (provider.url) output.url = provider.url;
  if (provider.path) output.path = provider.path;
  if (provider.interval) output.interval = provider.interval;
  if (provider.filter) output.filter = provider.filter;
  if (provider.excludeFilter) output["exclude-filter"] = provider.excludeFilter;

  if (provider.healthCheck) {
    output["health-check"] = {
      enable: provider.healthCheck.enable,
      url: provider.healthCheck.url,
      interval: provider.healthCheck.interval,
    };
  }

  if (provider.fetchProxy) output.proxy = provider.fetchProxy;

  return output;
}

export function renderRuleProvider(
  provider: RuleProviderSpec,
): Record<string, unknown> {
  const output: Record<string, unknown> = {
    type: provider.sourceType,
    behavior: provider.behavior,
  };

  if (provider.format) output.format = provider.format;
  if (provider.url) output.url = provider.url;
  if (provider.path) output.path = provider.path;
  if (provider.interval) output.interval = provider.interval;
  if (provider.payload) output.payload = provider.payload;

  return output;
}

export function renderRule(rule: RuleSpec): string {
  const target = resolvePolicy(rule.policy);

  switch (rule.match.kind) {
    case "domain":
      return `DOMAIN,${rule.match.value},${target}`;
    case "domain_suffix":
      return `DOMAIN-SUFFIX,${rule.match.value},${target}`;
    case "domain_keyword":
      return `DOMAIN-KEYWORD,${rule.match.value},${target}`;
    case "ip_cidr":
      return `IP-CIDR,${rule.match.value},${target}`;
    case "src_ip_cidr":
      return `SRC-IP-CIDR,${rule.match.value},${target}`;
    case "process_name":
      return `PROCESS-NAME,${rule.match.value},${target}`;
    case "process_name_regex":
      return `PROCESS-NAME-REGEX,${rule.match.value},${target}`;
    case "rule_set":
      return `RULE-SET,${rule.match.value},${target}`;
    case "geoip":
      return `GEOIP,${rule.match.value},${target}`;
    case "geosite":
      return `GEOSITE,${rule.match.value},${target}`;
    case "match":
      return `MATCH,${target}`;
  }
}

/**
 * 构建 geodata-mode 相关顶级配置段。
 * 启用后 Clash/Mihomo 客户端会自动下载并定期更新 geoip.dat / geosite.dat。
 */
export function buildGeoDataBlock(
  enabled: boolean,
  sourceId: GeoDataSourceId,
): Record<string, unknown> {
  if (!enabled) return {};
  const urls = buildGeoxUrlConfig(sourceId);
  return {
    "geodata-mode": true,
    "geo-auto-update": true,
    "geo-update-interval": 24,
    "geox-url": {
      geoip: urls.geoip,
      geosite: urls.geosite,
      mmdb: urls.mmdb,
    },
  };
}

export function stringifyYaml(value: unknown): string {
  return YAML.stringify(value, {
    indent: 2,
    lineWidth: 0,
  });
}
