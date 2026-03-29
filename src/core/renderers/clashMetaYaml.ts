import type { BuilderProject, RenderedConfig, TargetPlatform } from "../model/types";
import {
  renderProxyGroup,
  renderProxyProvider,
  renderRuleProvider,
  renderRule,
  stringifyYaml,
} from "./shared";

/**
 * Clash Meta / Mihomo 系通用配置：支持 HTTP 拉取 Base64 订阅、proxies 中 type: direct（直连）、
 * 无强制 path。当前主要用于 Sparkle 这条 Mihomo 风格导出链路。
 */
export function renderClashMetaStyle(
  project: BuilderProject,
  target: TargetPlatform,
): RenderedConfig {
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
    target,
    format: "yaml",
    warnings: [],
    content: stringifyYaml(output),
  };
}
