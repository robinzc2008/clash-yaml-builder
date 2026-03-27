import type { BuilderProject, RenderedConfig } from "../model/types";
import {
  renderProxyGroup,
  renderProxyProvider,
  renderRuleProvider,
  renderRule,
  stringifyYaml,
} from "./shared";

export function renderSparkle(project: BuilderProject): RenderedConfig {
  const groups = project.groups.map((group) =>
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

  return {
    target: "sparkle",
    format: "yaml",
    warnings: ["Sparkle output is a starter adapter and may need target-specific tuning."],
    content: stringifyYaml({
      proxyProviders,
      groups,
      ruleProviders,
      rules,
    }),
  };
}
