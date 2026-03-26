import type { BuilderProject, RenderedConfig } from "../model/types";
import {
  renderGroupMember,
  renderProxyProvider,
  renderRuleProvider,
  renderRule,
  stringifyYaml,
} from "./shared";

export function renderOpenClash(project: BuilderProject): RenderedConfig {
  const proxyGroups = project.groups.map((group) => ({
    name: group.name,
    type: group.type,
    proxies: group.members.map((member) => renderGroupMember(member, project)),
  }));

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
    target: "openclash",
    format: "yaml",
    warnings: [],
    content: stringifyYaml({
      "proxy-providers": proxyProviders,
      "proxy-groups": proxyGroups,
      "rule-providers": ruleProviders,
      rules,
    }),
  };
}
