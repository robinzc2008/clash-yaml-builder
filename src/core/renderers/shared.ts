import YAML from "yaml";
import type {
  BuilderProject,
  GroupMember,
  GroupSpec,
  PolicyRef,
  ProxyProviderSpec,
  RuleProviderSpec,
  RuleSpec,
} from "../model/types";

export function resolvePolicy(policy: PolicyRef): string {
  return policy.kind === "builtin" ? policy.value : policy.value;
}

/** 策略组成员里「直连」展示：DIRECT 为内核内置名；直连 为 proxies 里的具名 direct 节点（与 proxy-provider 的 proxy: 直连 一致） */
export interface RenderProxyGroupOptions {
  directMemberLabel?: "DIRECT" | "直连";
}

export function renderGroupMember(
  member: GroupMember,
  project: BuilderProject,
  options?: RenderProxyGroupOptions,
): string {
  switch (member.kind) {
    case "builtin":
      if (member.value === "DIRECT" && options?.directMemberLabel === "直连") {
        return "直连";
      }
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
  options?: RenderProxyGroupOptions,
): Record<string, unknown> {
  if (group.includeAll) {
    const entry: Record<string, unknown> = {
      name: group.name,
      type: group.type,
      "include-all": true,
    };
    if (group.testUrl) entry.url = group.testUrl;
    if (group.filter) entry.filter = group.filter;
    if (group.tolerance) entry.tolerance = group.tolerance;
    if (group.testInterval) entry.interval = group.testInterval;
    return entry;
  }

  return {
    name: group.name,
    type: group.type,
    proxies: group.members.map((member) => renderGroupMember(member, project, options)),
  };
}

export interface RenderProxyProviderOptions {
  /** 经典 Clash：HTTP provider 常需本地缓存路径；若设置则优先于 provider.path */
  cachePath?: string;
}

export function renderProxyProvider(
  provider: ProxyProviderSpec,
  options?: RenderProxyProviderOptions,
): Record<string, unknown> {
  const output: Record<string, unknown> = {
    type: provider.sourceType,
  };

  if (provider.url) output.url = provider.url;
  if (options?.cachePath) output.path = options.cachePath;
  else if (provider.path) output.path = provider.path;
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
  options?: { cachePath?: string },
): Record<string, unknown> {
  const output: Record<string, unknown> = {
    type: provider.sourceType,
    behavior: provider.behavior,
  };

  if (provider.format) output.format = provider.format;
  if (provider.url) output.url = provider.url;
  if (options?.cachePath) output.path = options.cachePath;
  else if (provider.path) output.path = provider.path;
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
    case "match":
      return `MATCH,${target}`;
  }
}

export function stringifyYaml(value: unknown): string {
  return YAML.stringify(value, {
    indent: 2,
    lineWidth: 0,
  });
}
