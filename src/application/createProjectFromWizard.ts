import type {
  BuilderProject,
  BuiltinPolicy,
  GroupSpec,
  ProxyProviderSpec,
  RuleProviderSpec,
  RuleSpec,
} from "../core/model/types";
import { presetPacks } from "../core/presets/presetPacks";
import { buildRemoteRuleProviderFromId } from "../core/sources/metaRulesDat";
import {
  getAllGroupTargetIds,
  getGroupNameByTarget,
  targetIdToPolicyRef,
  type WizardGroupTargetId,
} from "../features/wizard/routingTargets";
import type { WizardState } from "../features/wizard/types";

function buildGroupByTargetId(targetId: WizardGroupTargetId, state: WizardState): GroupSpec {
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
    default:
      return {
        id: targetId,
        name,
        type: "select",
        members: [
          { kind: "group", ref: "group-default-proxy" },
          { kind: "builtin", value: "DIRECT" },
        ],
      };
  }
}

function buildGroups(state: WizardState): GroupSpec[] {
  return getAllGroupTargetIds(state).map((targetId) => buildGroupByTargetId(targetId, state));
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

function buildProcessRules(state: WizardState): RuleSpec[] {
  const rules: RuleSpec[] = [];

  state.processRules.forEach((rule, index) => {
    const trimmed = rule.processName.trim();
    if (!trimmed) {
      return;
    }

    rules.push({
      id: `rule-process-${rule.id}`,
      match: {
        kind: "process_name",
        value: trimmed,
      },
      policy: targetIdToPolicyRef(rule.target, state),
      priority: 300 + index,
      enabled: true,
      comment: "Route the selected desktop app through the configured target.",
    });
  });

  return rules;
}

function buildCustomDomainRules(state: WizardState): RuleSpec[] {
  const rules: RuleSpec[] = [];

  state.customDomainRules.forEach((rule, index) => {
    const trimmed = rule.domain.trim();
    if (!trimmed) {
      return;
    }

    rules.push({
      id: `rule-custom-domain-${rule.id}`,
      match: { kind: "domain_suffix", value: trimmed },
      policy: targetIdToPolicyRef(rule.target, state),
      priority: 220 + index,
      enabled: true,
      comment: "Custom domain routing.",
    });
  });

  return rules;
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
  return selectedPresetIds.flatMap((presetId, presetIndex) => {
    const preset = presetPacks.find((item) => item.id === presetId);
    if (!preset) {
      return [];
    }

    const targetId = state.ruleAssignments[`preset:${presetId}`] ?? "group-default-proxy";

    return preset.rules.map((rule, index) => ({
      ...rule,
      id: `${rule.id}-${presetIndex + 1}-${index + 1}`,
      policy: targetIdToPolicyRef(targetId, state),
      priority: 100 + presetIndex * 10 + index,
    }));
  });
}

function buildPresetRuleProviders(selectedPresetIds: string[]): RuleProviderSpec[] {
  return selectedPresetIds.flatMap((presetId) => {
    const preset = presetPacks.find((item) => item.id === presetId);
    return preset?.ruleProviders ?? [];
  });
}

function buildRemoteRuleProviders(state: WizardState): RuleProviderSpec[] {
  const providers: RuleProviderSpec[] = [];

  state.selectedRemoteRuleIds.forEach((id) => {
    const provider = buildRemoteRuleProviderFromId(id, state.remoteRuleAliases[id]);
    if (provider) {
      providers.push(provider);
    }
  });

  return providers;
}

function buildRemoteRules(state: WizardState): RuleSpec[] {
  const rules: RuleSpec[] = [];

  state.selectedRemoteRuleIds.forEach((id, index) => {
    const provider = buildRemoteRuleProviderFromId(id, state.remoteRuleAliases[id]);
    if (!provider) {
      return;
    }

    const targetId = state.ruleAssignments[`remote:${id}`] ?? "group-default-proxy";

    rules.push({
      id: `remote-rule-${id.replace(/[^a-z0-9-:]/gi, "-")}`,
      match: { kind: "rule_set", value: provider.name },
      policy: targetIdToPolicyRef(targetId, state),
      priority: 180 + index,
      enabled: true,
      comment: "MetaCubeX remote rule selection.",
    });
  });

  return rules;
}

export function createProjectFromWizard(state: WizardState): BuilderProject {
  const now = new Date().toISOString();

  const rules = mergeUniqueById<RuleSpec>([
    ...(state.enableLanDirect ? [buildLanRule(state.lanCidr)] : []),
    ...buildPresetRules(state.selectedPresetIds, state),
    ...buildRemoteRules(state),
    ...buildCustomDomainRules(state),
    ...(state.target === "windows-mihomo" ? buildProcessRules(state) : []),
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
    groups: buildGroups(state),
    proxyProviders: buildBaseProxyProviders(),
    ruleProviders: mergeUniqueById<RuleProviderSpec>([
      ...buildPresetRuleProviders(state.selectedPresetIds),
      ...buildRemoteRuleProviders(state),
    ]),
    rules,
    features: [
      {
        key: "future-apple-shell",
        enabled: false,
      },
    ],
  };
}
