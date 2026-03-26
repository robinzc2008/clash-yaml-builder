import type { BuilderProject } from "../core/model/types";

export function explainProject(project: BuilderProject): string[] {
  const lines: string[] = [];

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

  lines.push(
    `The generated output includes ${project.groups.length} policy groups, ${project.ruleProviders.length} rule providers, and ${project.rules.length} total rules.`,
  );

  return lines;
}
