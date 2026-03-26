import YAML from "yaml";
import type {
  BuilderProject,
  GroupMember,
  PolicyRef,
  ProxyProviderSpec,
  RuleProviderSpec,
  RuleSpec,
} from "../model/types";

export function resolvePolicy(policy: PolicyRef): string {
  return policy.kind === "builtin" ? policy.value : policy.value;
}

export function renderGroupMember(member: GroupMember, project: BuilderProject): string {
  switch (member.kind) {
    case "builtin":
      return member.value;
    case "group": {
      const group = project.groups.find((item) => item.id === member.ref);
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

export function renderProxyProvider(
  provider: ProxyProviderSpec,
): Record<string, unknown> {
  const output: Record<string, unknown> = {
    type: provider.sourceType,
  };

  if (provider.url) {
    output.url = provider.url;
  }
  if (provider.path) {
    output.path = provider.path;
  }
  if (provider.interval) {
    output.interval = provider.interval;
  }
  if (provider.filter) {
    output.filter = provider.filter;
  }
  if (provider.excludeFilter) {
    output["exclude-filter"] = provider.excludeFilter;
  }

  return output;
}

export function renderRuleProvider(
  provider: RuleProviderSpec,
): Record<string, unknown> {
  const output: Record<string, unknown> = {
    type: provider.sourceType,
    behavior: provider.behavior,
  };

  if (provider.format) {
    output.format = provider.format;
  }
  if (provider.url) {
    output.url = provider.url;
  }
  if (provider.path) {
    output.path = provider.path;
  }
  if (provider.interval) {
    output.interval = provider.interval;
  }
  if (provider.payload) {
    output.payload = provider.payload;
  }

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
