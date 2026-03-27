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
import type { WizardRegionGroup, WizardState } from "../features/wizard/types";

/* ------------------------------------------------------------------ */
/*  地区节点组（Region Groups）                                        */
/* ------------------------------------------------------------------ */

/** 地区组的显示名：url-test 类型追加"-自动" / "-Auto" */
function regionDisplayName(region: WizardRegionGroup, language: string): string {
  if (region.type === "url-test") {
    const suffix = language === "zh" ? "-自动" : " Auto";
    return region.name.endsWith(suffix) ? region.name : `${region.name}${suffix}`;
  }
  return region.name;
}

function buildRegionGroups(state: WizardState): GroupSpec[] {
  return state.regionGroups.map((region) => {
    const displayName = regionDisplayName(region, state.language);

    if (!region.filter) {
      return {
        id: region.id,
        name: displayName,
        type: region.type,
        members: [],
        includeAll: true,
      };
    }

    return {
      id: region.id,
      name: displayName,
      type: region.type,
      members: [],
      includeAll: true,
      filter: region.filter,
      tolerance: region.tolerance > 0 ? region.tolerance : undefined,
      testInterval: region.interval > 0 ? region.interval : undefined,
    };
  });
}

/* ------------------------------------------------------------------ */
/*  服务策略组（Service Groups）                                       */
/* ------------------------------------------------------------------ */

function buildServiceGroupByTargetId(
  targetId: WizardGroupTargetId,
  state: WizardState,
): GroupSpec {
  const name = getGroupNameByTarget(targetId, state);

  const assignedRegionIds = state.serviceGroupRegions[targetId] ?? [];
  const regionMembers: GroupSpec["members"] = assignedRegionIds
    .map((regionId) => {
      const region = state.regionGroups.find((r) => r.id === regionId);
      if (!region) return null;
      return {
        kind: "group" as const,
        ref: regionDisplayName(region, state.language),
      };
    })
    .filter((m): m is NonNullable<typeof m> => m !== null);

  return {
    id: targetId,
    name,
    type: "select",
    members: [
      { kind: "builtin", value: "DIRECT" as const },
      ...regionMembers,
    ],
  };
}

function buildServiceGroups(state: WizardState): GroupSpec[] {
  return getAllGroupTargetIds(state).map((targetId) =>
    buildServiceGroupByTargetId(targetId, state),
  );
}

/* ------------------------------------------------------------------ */
/*  订阅源（Proxy Providers）                                          */
/* ------------------------------------------------------------------ */

function buildProxyProviders(state: WizardState): ProxyProviderSpec[] {
  const providers: ProxyProviderSpec[] = [];

  for (const sub of state.subscriptions) {
    providers.push({
      id: `provider-${sub.id}`,
      name: sub.name || `provider-${sub.id}`,
      sourceType: "http",
      url: sub.url || "https://example.com/subscription.yaml",
      interval: 86400,
      healthCheck: {
        enable: true,
        url: "https://www.gstatic.com/generate_204",
        interval: 300,
      },
      fetchProxy: "直连",
    });
  }

  if (providers.length === 0) {
    providers.push({
      id: "provider-main",
      name: "MainProvider",
      sourceType: "http",
      url: "https://example.com/subscription.yaml",
      interval: 86400,
      healthCheck: {
        enable: true,
        url: "https://www.gstatic.com/generate_204",
        interval: 300,
      },
      fetchProxy: "直连",
    });
  }

  return providers;
}

/* ------------------------------------------------------------------ */
/*  规则构建                                                           */
/* ------------------------------------------------------------------ */

function mergeUniqueById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function buildLanRule(lanCidr: string): RuleSpec {
  return {
    id: "rule-lan-direct",
    match: { kind: "src_ip_cidr", value: lanCidr },
    policy: { kind: "builtin", value: "DIRECT" },
    priority: 10,
    enabled: true,
  };
}

function buildProcessRules(state: WizardState): RuleSpec[] {
  return state.processRules
    .filter((rule) => rule.processName.trim())
    .map((rule, index) => ({
      id: `rule-process-${rule.id}`,
      match: { kind: "process_name" as const, value: rule.processName.trim() },
      policy: targetIdToPolicyRef(rule.target, state),
      priority: 300 + index,
      enabled: true,
    }));
}

function buildCustomDomainRules(state: WizardState): RuleSpec[] {
  return state.customDomainRules
    .filter((rule) => rule.domain.trim())
    .map((rule, index) => ({
      id: `rule-custom-domain-${rule.id}`,
      match: { kind: "domain_suffix" as const, value: rule.domain.trim() },
      policy: targetIdToPolicyRef(rule.target, state),
      priority: 220 + index,
      enabled: true,
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
  return selectedPresetIds.flatMap((presetId, presetIndex) => {
    const preset = presetPacks.find((item) => item.id === presetId);
    if (!preset) return [];
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
  return state.selectedRemoteRuleIds
    .map((id) => buildRemoteRuleProviderFromId(id, state.remoteRuleAliases[id]))
    .filter((p): p is NonNullable<typeof p> => p !== null);
}

function buildRemoteRules(state: WizardState): RuleSpec[] {
  return state.selectedRemoteRuleIds
    .map((id, index) => {
      const provider = buildRemoteRuleProviderFromId(id, state.remoteRuleAliases[id]);
      if (!provider) return null;
      const targetId = state.ruleAssignments[`remote:${id}`] ?? "group-default-proxy";
      return {
        id: `remote-rule-${id.replace(/[^a-z0-9-:]/gi, "-")}`,
        match: { kind: "rule_set" as const, value: provider.name },
        policy: targetIdToPolicyRef(targetId, state),
        priority: 180 + index,
        enabled: true,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);
}

/* ------------------------------------------------------------------ */
/*  主入口                                                             */
/* ------------------------------------------------------------------ */

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
    groups: [...buildServiceGroups(state), ...buildRegionGroups(state)],
    proxyProviders: buildProxyProviders(state),
    ruleProviders: mergeUniqueById<RuleProviderSpec>([
      ...buildPresetRuleProviders(state.selectedPresetIds),
      ...buildRemoteRuleProviders(state),
    ]),
    rules,
    features: [{ key: "future-apple-shell", enabled: false }],
  };
}
