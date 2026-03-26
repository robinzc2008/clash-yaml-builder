import { platformCapabilities } from "../capabilities/platformCapabilities";
import type {
  BuilderProject,
  ValidationIssue,
  ValidationResult,
} from "../model/types";

function validateGroupReferences(project: BuilderProject): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const groupNames = new Set(project.groups.map((group) => group.name));
  const groupIds = new Set(project.groups.map((group) => group.id));
  const proxyProviderIds = new Set(
    project.proxyProviders.map((provider) => provider.id),
  );

  for (const group of project.groups) {
    for (const member of group.members) {
      if (member.kind === "group" && !groupIds.has(member.ref)) {
        issues.push({
          id: `missing-group-ref-${group.id}-${member.ref}`,
          severity: "error",
          message: `Group "${group.name}" references missing group "${member.ref}".`,
        });
      }

      if (
        member.kind === "proxy-provider" &&
        !proxyProviderIds.has(member.ref)
      ) {
        issues.push({
          id: `missing-provider-ref-${group.id}-${member.ref}`,
          severity: "error",
          message: `Group "${group.name}" references missing proxy provider "${member.ref}".`,
        });
      }
    }
  }

  for (const rule of project.rules) {
    if (rule.policy.kind === "group" && !groupNames.has(rule.policy.value)) {
      issues.push({
        id: `missing-policy-group-${rule.id}`,
        severity: "error",
        message: `Rule "${rule.id}" points to unknown policy group "${rule.policy.value}".`,
      });
    }

    if (
      rule.match.kind === "rule_set" &&
      rule.match.value &&
      !project.ruleProviders.some((provider) => provider.name === rule.match.value)
    ) {
      issues.push({
        id: `missing-rule-provider-${rule.id}`,
        severity: "error",
        message: `Rule "${rule.id}" references missing rule provider "${rule.match.value}".`,
      });
    }
  }

  return issues;
}

function validateCapabilities(project: BuilderProject): ValidationIssue[] {
  const capability = platformCapabilities[project.meta.target];
  const issues: ValidationIssue[] = [];

  for (const rule of project.rules) {
    if (
      (rule.match.kind === "process_name" ||
        rule.match.kind === "process_name_regex") &&
      !capability.supports.processRule
    ) {
      issues.push({
        id: `unsupported-process-rule-${rule.id}`,
        severity: "warning",
        message: `${capability.label} does not currently support process rules for rule "${rule.id}".`,
      });
    }

    if (rule.match.kind === "src_ip_cidr" && !capability.supports.srcIpRule) {
      issues.push({
        id: `unsupported-src-ip-rule-${rule.id}`,
        severity: "warning",
        message: `${capability.label} does not support source IP rules for rule "${rule.id}".`,
      });
    }
  }

  for (const provider of project.ruleProviders) {
    if (provider.sourceType === "inline" && !capability.supports.inlineProvider) {
      issues.push({
        id: `unsupported-inline-provider-${provider.id}`,
        severity: "warning",
        message: `${capability.label} does not support inline providers.`,
      });
    }

    if (provider.format === "mrs" && !capability.supports.mrsFormat) {
      issues.push({
        id: `unsupported-mrs-provider-${provider.id}`,
        severity: "warning",
        message: `${capability.label} does not support MRS rule provider format.`,
      });
    }
  }

  return issues;
}

export function validateProject(project: BuilderProject): ValidationResult {
  return {
    issues: [
      ...validateGroupReferences(project),
      ...validateCapabilities(project),
    ],
  };
}
