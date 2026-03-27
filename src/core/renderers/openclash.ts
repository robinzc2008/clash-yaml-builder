import type { BuilderProject, RenderedConfig } from "../model/types";
import {
  buildGeoDataBlock,
  renderProxyGroup,
  renderProxyProvider,
  renderRuleProvider,
  renderRule,
  stringifyYaml,
} from "./shared";

export function renderOpenClash(project: BuilderProject): RenderedConfig {
  const proxyGroups = project.groups.map((group) =>
    renderProxyGroup(group, project),
  );

  const proxyProviders = Object.fromEntries(
    project.proxyProviders.map((provider) => [
      provider.name,
      renderProxyProvider(provider),
    ]),
  );

  const ruleProviders = Object.fromEntries(
    project.ruleProviders.map((provider) => [
      provider.name,
      renderRuleProvider(provider),
    ]),
  );

  const rules = project.rules
    .filter((rule) => rule.enabled)
    .map((rule) => renderRule(rule));

  const geoBlock = buildGeoDataBlock(
    project.settings.enableGeoDataMode,
    project.settings.geoDataSource,
  );

  const output: Record<string, unknown> = {
    ...geoBlock,
    "proxy-providers": proxyProviders,
    proxies: [{ name: "直连", type: "direct" }],
    "proxy-groups": proxyGroups,
    "rule-providers": ruleProviders,
    rules,
  };

  return {
    target: "openclash",
    format: "yaml",
    warnings: [],
    content: stringifyYaml(output),
  };
}
