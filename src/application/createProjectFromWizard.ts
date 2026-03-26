import type {
  BuilderProject,
  BuiltinPolicy,
  GroupSpec,
  ProxyProviderSpec,
  RuleProviderSpec,
  RuleSpec,
  TargetPlatform,
} from "../core/model/types";
import { presetPacks } from "../core/presets/presetPacks";
import { buildRemoteRuleProviderFromId } from "../core/sources/metaRulesDat";
import {
  getActiveGroupTargetIds,
  getGroupNameByTarget,
  targetIdToPolicyRef,
} from "../features/wizard/routingTargets";
import type { NamedGroupTargetId } from "../features/wizard/routingTargets";
import type { WizardPolicyTargetId, WizardState } from "../features/wizard/types";

function buildGroupByTargetId(targetId: NamedGroupTargetId, state: WizardState): GroupSpec {
  const name = getGroupNameByTarget(targetId, state);

  switch (targetId) {
    case "group-default-proxy":
      return {
        id: targetId,
        name,
        type: "select",
        members: [
          { kind: "builtin", value: "DIRECT" },
          { kind: "proxy-provider", ref: "provider-main" },
        ],
      };
    case "group-ai-services":
    case "group-streaming":
      return {
        id: targetId,
        name,
        type: "select",
        members: [
          { kind: "group", ref: "group-default-proxy" },
          { kind: "builtin", value: "DIRECT" },
        ],
      };
    case "group-apple":
      return {
        id: targetId,
        name,
        type: "select",
        members: [
          { kind: "builtin", value: "DIRECT" },
          { kind: "group", ref: "group-default-proxy" },
        ],
      };
  }
}

function buildBaseGroups(state: WizardState): GroupSpec[] {
  return getActiveGroupTargetIds(state).map((targetId) => buildGroupByTargetId(targetId, state));
}

function buildBaseProxyProviders(): ProxyProviderSpec[] {
  return [
    {
      id: "provider-main",
      name: "MainProvider",
      sourceType: "http",
      url: "https://example.com/subscription.yaml",
      interval: 3600,
    },
  ];
}

function mergeUniqueById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);
    return true;
  });
}

function buildLanRule(lanCidr: string): RuleSpec {
  return {
    id: "rule-lan-direct",
    match: {
      kind: "src_ip_cidr",
      value: lanCidr,
    },
    policy: { kind: "builtin", value: "DIRECT" },
    priority: 10,
    enabled: true,
    comment: "Keep LAN traffic direct.",
  };
}

function buildProcessRule(processName: string, targetId: WizardPolicyTargetId, state: WizardState): RuleSpec | null {
  const trimmed = processName.trim();
  if (!trimmed) {
    return null;
  }

  return {
    id: "rule-process-app",
    match: {
      kind: "process_name",
      value: trimmed,
    },
    policy: targetIdToPolicyRef(targetId, state),
    priority: 30,
    enabled: true,
    comment: "Route the selected desktop app through the configured target.",
  };
}

function buildCustomDomainRules(domains: string, targetId: WizardPolicyTargetId, state: WizardState): RuleSpec[] {
  return domains
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((domain, index) => ({
      id: `rule-custom-domain-${index + 1}`,
      match: { kind: "domain_suffix" as const, value: domain },
      policy: targetIdToPolicyRef(targetId, state),
      priority: 200 + index,
      enabled: true,
      comment: "Custom domain routing.",
    }));
}

function buildFinalPolicy(
  state: WizardState,
): { kind: "builtin"; value: BuiltinPolicy } | { kind: "group"; value: string } {
  if (state.finalPolicyMode === "direct") {
    return { kind: "builtin", value: "DIRECT" };
  }

  return { kind: "group", value: state.defaultProxyGroupName };
}

function buildPresetRules(selectedPresetIds: string[], state: WizardState): RuleSpec[] {
  return selectedPresetIds.flatMap((presetId) => {
    const preset = presetPacks.find((item) => item.id === presetId);
    if (!preset) {
      return [];
    }

    const targetId = state.ruleAssignments[`preset:${presetId}`] ?? "group-default-proxy";

    return preset.rules.map((rule, index) => ({
      ...rule,
      id: `${rule.id}-${index + 1}`,
      policy: targetIdToPolicyRef(targetId, state),
    }));
  });
}

function buildPresetRuleProviders(selectedPresetIds: string[]): RuleProviderSpec[] {
  return selectedPresetIds.flatMap((presetId) => {
    const preset = presetPacks.find((item) => item.id === presetId);
    return preset?.ruleProviders ?? [];
  });
}

function buildRemoteRuleProviders(selectedRemoteRuleIds: string[]): RuleProviderSpec[] {
  const providers: RuleProviderSpec[] = [];

  selectedRemoteRuleIds.forEach((id) => {
    const provider = buildRemoteRuleProviderFromId(id);
    if (provider) {
      providers.push(provider);
    }
  });

  return providers;
}

function buildRemoteRules(selectedRemoteRuleIds: string[], state: WizardState): RuleSpec[] {
  const rules: RuleSpec[] = [];

  selectedRemoteRuleIds.forEach((id, index) => {
    const provider = buildRemoteRuleProviderFromId(id);
    if (!provider) {
      return;
    }

    const targetId = state.ruleAssignments[`remote:${id}`] ?? "group-default-proxy";

    rules.push({
      id: `remote-rule-${id.replace(/[^a-z0-9-:]/gi, "-")}`,
      match: { kind: "rule_set", value: provider.name },
      policy: targetIdToPolicyRef(targetId, state),
      priority: 120 + index,
      enabled: true,
      comment: "MetaCubeX remote rule selection.",
    });
  });

  return rules;
}

export function createProjectFromWizard(state: WizardState): BuilderProject {
  const now = new Date().toISOString();
  const groups = buildBaseGroups(state);
  const proxyProviders = buildBaseProxyProviders();

  const ruleProviders = mergeUniqueById<RuleProviderSpec>([
    ...buildPresetRuleProviders(state.selectedPresetIds),
    ...buildRemoteRuleProviders(state.selectedRemoteRuleIds),
  ]);

  const rules = mergeUniqueById<RuleSpec>([
    ...(state.enableLanDirect ? [buildLanRule(state.lanCidr)] : []),
    ...buildPresetRules(state.selectedPresetIds, state),
    ...buildRemoteRules(state.selectedRemoteRuleIds, state),
    ...buildCustomDomainRules(state.customDomains, state.customDomainTarget, state),
    ...(state.target === "windows-mihomo"
      ? [buildProcessRule(state.processName, state.processTarget, state)].filter(
          (rule): rule is RuleSpec => Boolean(rule),
        )
      : []),
    {
      id: "rule-final-match",
      match: { kind: "match" },
      policy: buildFinalPolicy(state),
      priority: 9999,
      enabled: true,
      comment: "Final fallback.",
    },
  ]);

  return {
    version: 1,
    meta: {
      name: state.projectName.trim() || "Untitled Routing Project",
      target: state.target,
      mode: state.mode,
      createdAt: now,
      updatedAt: now,
    },
    settings: {
      finalPolicy: buildFinalPolicy(state),
      enableLanDirect: state.enableLanDirect,
      enableAdBlock: state.selectedPresetIds.includes("preset-adblock"),
    },
    groups,
    proxyProviders,
    ruleProviders,
    rules,
    features: [
      {
        key: "future-apple-shell",
        enabled: false,
      },
    ],
  };
}
