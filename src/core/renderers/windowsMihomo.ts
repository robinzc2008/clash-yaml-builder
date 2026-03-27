import type { BuilderProject, RenderedConfig } from "../model/types";
import {
  renderProxyGroup,
  renderProxyProvider,
  renderRuleProvider,
  renderRule,
  stringifyYaml,
} from "./shared";

export function renderWindowsMihomo(project: BuilderProject): RenderedConfig {
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

  const output: Record<string, unknown> = {
    "proxy-providers": proxyProviders,
    proxies: [{ name: "直连", type: "direct" }],
    "proxy-groups": proxyGroups,
    "rule-providers": ruleProviders,
    rules,
  };

  return {
    target: "windows-mihomo",
    format: "yaml",
    warnings: [],
    content: stringifyYaml(output),
  };
}
