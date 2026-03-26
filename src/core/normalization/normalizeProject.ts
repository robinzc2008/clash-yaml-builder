import type { BuilderProject, GroupSpec, RuleSpec } from "../model/types";

function sortRules(rules: RuleSpec[]): RuleSpec[] {
  return [...rules].sort((left, right) => left.priority - right.priority);
}

function dedupeGroups(groups: GroupSpec[]): GroupSpec[] {
  const seen = new Set<string>();
  return groups.filter((group) => {
    if (seen.has(group.id)) {
      return false;
    }

    seen.add(group.id);
    return true;
  });
}

export function normalizeProject(project: BuilderProject): BuilderProject {
  return {
    ...project,
    groups: dedupeGroups(project.groups),
    rules: sortRules(project.rules),
    meta: {
      ...project.meta,
      updatedAt: new Date().toISOString(),
    },
  };
}
