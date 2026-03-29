import type { BuilderProject, RenderedConfig } from "../model/types";
import {
  renderProxyGroup,
  renderProxyProvider,
  renderRuleProvider,
  renderRule,
  stringifyYaml,
} from "./shared";

function createRegexFromFilter(filter: string) {
  const trimmed = filter.trim();
  if (!trimmed) {
    return null;
  }

  const inlineIgnoreCase = trimmed.includes("(?i)");
  const normalized = trimmed.replace(/\(\?i\)/g, "");

  try {
    return new RegExp(normalized, inlineIgnoreCase ? "i" : undefined);
  } catch {
    return null;
  }
}

function renderWindowsMihomoGroup(project: BuilderProject, group: BuilderProject["groups"][number]) {
  if (!group.includeAll) {
    return renderProxyGroup(group, project);
  }

  if (project.proxies?.length) {
    const matcher = group.filter ? createRegexFromFilter(group.filter) : null;
    const proxyNames = project.proxies
      .map((proxy) => proxy.name)
      .filter((name) => (matcher ? matcher.test(name) : true));

    const fallbackProxyNames = proxyNames.length
      ? proxyNames
      : project.proxies.map((proxy) => proxy.name);

    const entry: Record<string, unknown> = {
      name: group.name,
      type: group.type,
      proxies: fallbackProxyNames,
    };

    if (group.testUrl) entry.url = group.testUrl;
    if (group.tolerance) entry.tolerance = group.tolerance;
    if (group.testInterval) entry.interval = group.testInterval;
    return entry;
  }

  const entry: Record<string, unknown> = {
    name: group.name,
    type: group.type,
    use: project.proxyProviders.map((provider) => provider.name),
  };

  if (group.testUrl) entry.url = group.testUrl;
  if (group.filter) entry.filter = group.filter;
  if (group.tolerance) entry.tolerance = group.tolerance;
  if (group.testInterval) entry.interval = group.testInterval;
  return entry;
}

/**
 * Clash for Windows + Mihomo core:
 * - prefers builtin DIRECT instead of a named `type: direct` proxy
 * - can export either proxy-providers or a self-contained proxies list
 * - prefers builtin DIRECT instead of a named `type: direct` proxy
 * - avoids emitting the extra direct proxy node because the CFW side parser rejects it
 */
export function renderWindowsMihomo(project: BuilderProject): RenderedConfig {
  const proxyGroups = project.groups.map((group) => renderWindowsMihomoGroup(project, group));

  const proxyProviders = Object.fromEntries(
    project.proxyProviders.map((provider) => {
      const safePath = `providers/${provider.id.replace(/[^a-z0-9-]/gi, "_")}.yaml`;
      return [
        provider.name,
        renderProxyProvider(provider, { cachePath: safePath }),
      ];
    }),
  );

  const ruleProviders = Object.fromEntries(
    project.ruleProviders.map((provider) => {
      const safePath = `ruleset/${provider.id.replace(/[^a-z0-9-]/gi, "_")}.yaml`;
      return [provider.name, renderRuleProvider(provider, { cachePath: safePath })];
    }),
  );

  const rules = project.rules
    .filter((rule) => rule.enabled)
    .map((rule) => renderRule(rule));

  const output: Record<string, unknown> = {
    ...(project.proxies?.length ? { proxies: project.proxies } : { "proxy-providers": proxyProviders }),
    "proxy-groups": proxyGroups,
    "rule-providers": ruleProviders,
    rules,
  };

  return {
    target: "windows-mihomo",
    format: "yaml",
    warnings: [
      project.proxies?.length
        ? "Clash (Windows client): the exported YAML embeds subscription nodes directly. If the airport subscription updates later, generate the YAML again."
        : "Clash (Windows client): proxy-providers include a local cache path and avoid named direct proxies to match the Windows parser more closely.",
    ],
    content: stringifyYaml(output),
  };
}
