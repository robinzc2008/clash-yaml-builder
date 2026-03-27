import type { AppLanguage, BuilderProject } from "../core/model/types";

export function explainProject(project: BuilderProject, language: AppLanguage): string[] {
  const lines: string[] = [];

  if (language === "zh") {
    lines.push(`当前项目面向 ${project.meta.target}，保存名称为“${project.meta.name}”。`);
    const finalPolicyZh =
      project.settings.finalPolicy.kind === "group"
        ? `策略组“${project.settings.finalPolicy.value}”`
        : project.settings.finalPolicy.value;
    lines.push(`没有被前置规则命中的流量，最终会走 ${finalPolicyZh}。`);

    if (project.settings.enableLanDirect) {
      const lanRule = project.rules.find((rule) => rule.match.kind === "src_ip_cidr");
      if (lanRule?.match.value) {
        lines.push(`来自 ${lanRule.match.value} 的局域网流量会优先直连。`);
      }
    }

    const ruleSetRules = project.rules.filter((rule) => rule.match.kind === "rule_set");
    if (ruleSetRules.length > 0) {
      lines.push(`当前选中的模板一共添加了 ${ruleSetRules.length} 条基于上游规则集的分流规则。`);
    }

    const customDomainCount = project.rules.filter((rule) =>
      rule.id.startsWith("rule-custom-domain-"),
    ).length;
    if (customDomainCount > 0) {
      lines.push(`用户额外补充了 ${customDomainCount} 条自定义域名后缀规则。`);
    }

    if (project.meta.target === "windows-mihomo") {
      const processRule = project.rules.find((rule) => rule.match.kind === "process_name");
      if (processRule?.match.value) {
        lines.push(`已为 Windows 进程 ${processRule.match.value} 启用按进程分流。`);
      }
    }

    const regionGroupCount = project.groups.filter((g) => g.includeAll).length;
    const serviceGroupCount = project.groups.length - regionGroupCount;
    const subCount = project.proxyProviders.length;

    if (subCount > 0) {
      lines.push(`配置了 ${subCount} 个订阅源作为 proxy-providers。`);
    }
    if (regionGroupCount > 0) {
      lines.push(`启用了 ${regionGroupCount} 个地区节点组（按正则筛选节点，自动测速选优）。`);
    }

    lines.push(
      `最终输出包含 ${serviceGroupCount} 个服务策略组、${regionGroupCount} 个地区节点组、${project.ruleProviders.length} 个规则源，以及 ${project.rules.length} 条规则。`,
    );
    return lines;
  }

  lines.push(
    `This project targets ${project.meta.target} and uses "${project.meta.name}" as the saved configuration name.`,
  );

  const finalPolicy =
    project.settings.finalPolicy.kind === "group"
      ? `the group "${project.settings.finalPolicy.value}"`
      : project.settings.finalPolicy.value;
  lines.push(`Fallback traffic that matches no earlier rule will use ${finalPolicy}.`);

  if (project.settings.enableLanDirect) {
    const lanRule = project.rules.find((rule) => rule.match.kind === "src_ip_cidr");
    if (lanRule?.match.value) {
      lines.push(`LAN traffic from ${lanRule.match.value} is routed directly first.`);
    }
  }

  const ruleSetRules = project.rules.filter((rule) => rule.match.kind === "rule_set");
  if (ruleSetRules.length > 0) {
    lines.push(
      `Selected service templates add ${ruleSetRules.length} rule-set based routing entries for upstream domain collections.`,
    );
  }

  const customDomainCount = project.rules.filter((rule) =>
    rule.id.startsWith("rule-custom-domain-"),
  ).length;
  if (customDomainCount > 0) {
    lines.push(`${customDomainCount} custom domain suffix rules were added by the user.`);
  }

  if (project.meta.target === "windows-mihomo") {
    const processRule = project.rules.find((rule) => rule.match.kind === "process_name");
    if (processRule?.match.value) {
      lines.push(`Windows process routing is enabled for ${processRule.match.value}.`);
    }
  }

  const regionGroupCount = project.groups.filter((g) => g.includeAll).length;
  const serviceGroupCount = project.groups.length - regionGroupCount;
  const subCount = project.proxyProviders.length;

  if (subCount > 0) {
    lines.push(`${subCount} subscription source(s) configured as proxy-providers.`);
  }
  if (regionGroupCount > 0) {
    lines.push(`${regionGroupCount} region node group(s) enabled for auto-selection by latency.`);
  }

  lines.push(
    `The generated output includes ${serviceGroupCount} service groups, ${regionGroupCount} region groups, ${project.ruleProviders.length} rule providers, and ${project.rules.length} total rules.`,
  );

  return lines;
}
