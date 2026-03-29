import type { BuilderProject, RenderedConfig } from "../model/types";
import {
  renderProxyGroup,
  renderProxyProvider,
  renderRuleProvider,
  renderRule,
  stringifyYaml,
} from "./shared";

/**
 * Sparkle 使用 Mihomo / Clash Meta 内核，本地配置必须与标准 YAML 字段一致。
 * 若使用 camelCase（groups、proxyProviders），内核不会识别 proxy-groups，
 * 规则里引用的策略组名会报「proxy not found」。
 */
export function renderSparkle(project: BuilderProject): RenderedConfig {
  const groupOpts = { directMemberLabel: "直连" as const };
  const proxyGroups = project.groups.map((group) =>
    renderProxyGroup(group, project, groupOpts),
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
    target: "sparkle",
    format: "yaml",
    warnings: [],
    content: stringifyYaml(output),
  };
}
