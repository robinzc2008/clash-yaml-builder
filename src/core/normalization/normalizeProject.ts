import type { BuilderProject, GroupSpec, MatchKind, RuleSpec } from "../model/types";

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

const inlineRuleKindMap: Record<string, MatchKind> = {
  DOMAIN: "domain",
  "DOMAIN-SUFFIX": "domain_suffix",
  "DOMAIN-KEYWORD": "domain_keyword",
  "IP-CIDR": "ip_cidr",
  "SRC-IP-CIDR": "src_ip_cidr",
  "PROCESS-NAME": "process_name",
  "PROCESS-NAME-REGEX": "process_name_regex",
  GEOIP: "geoip",
  MATCH: "match",
};

function parseInlineRulePayloadLine(
  line: string,
): RuleSpec["match"] | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }

  const [rawKind = "", rawValue] = trimmed.split(",").map((part) => part.trim());
  const kind = inlineRuleKindMap[rawKind.toUpperCase()];

  if (!kind) {
    return null;
  }

  if (kind === "match") {
    return { kind };
  }

  if (!rawValue) {
    return null;
  }

  return {
    kind,
    value: rawValue,
  };
}

function expandInlineRuleProviders(project: BuilderProject): BuilderProject {
  const inlineProviders = new Map(
    project.ruleProviders
      .filter((provider) => provider.sourceType === "inline")
      .map((provider) => [provider.name, provider] as const),
  );

  if (inlineProviders.size === 0) {
    return project;
  }

  const rules: RuleSpec[] = [];

  for (const rule of project.rules) {
    if (rule.match.kind !== "rule_set" || !rule.match.value) {
      rules.push(rule);
      continue;
    }

    const provider = inlineProviders.get(rule.match.value);
    if (!provider?.payload?.length) {
      rules.push(rule);
      continue;
    }

    const expandedMatches = provider.payload
      .map((line) => parseInlineRulePayloadLine(line))
      .filter((match): match is NonNullable<typeof match> => match !== null);

    if (expandedMatches.length === 0) {
      continue;
    }

    expandedMatches.forEach((match, index) => {
      rules.push({
        ...rule,
        id: `${rule.id}-inline-${provider.id}-${index + 1}`,
        match,
        priority: rule.priority + index / 1000,
        comment:
          rule.comment ??
          `Expanded from inline ruleset ${provider.name}`,
      });
    });
  }

  return {
    ...project,
    ruleProviders: project.ruleProviders.filter(
      (provider) => provider.sourceType !== "inline",
    ),
    rules,
  };
}

export function normalizeProject(project: BuilderProject): BuilderProject {
  const normalizedProject = expandInlineRuleProviders(project);

  return {
    ...normalizedProject,
    groups: dedupeGroups(normalizedProject.groups),
    rules: sortRules(normalizedProject.rules),
    meta: {
      ...normalizedProject.meta,
      updatedAt: new Date().toISOString(),
    },
  };
}
