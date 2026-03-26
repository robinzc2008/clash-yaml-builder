import type { PolicyRef } from "../../core/model/types";
import type { PresetPack } from "../../core/presets/presetPacks";
import type { MetaRulesDatRemoteItem } from "../../core/sources/metaRulesDat";
import type {
  AppLanguage,
  WizardCustomGroup,
  WizardPolicyTargetId,
  WizardState,
} from "./types";

export const namedGroupTargetIds = [
  "group-default-proxy",
  "group-ai-services",
  "group-streaming",
  "group-apple",
] as const;

export type NamedGroupTargetId = (typeof namedGroupTargetIds)[number];
export type WizardGroupTargetId = NamedGroupTargetId | `group-custom:${string}`;

export function isGroupTargetId(value: WizardPolicyTargetId): value is WizardGroupTargetId {
  return value.startsWith("group-");
}

export function getCustomGroupIdFromTarget(targetId: WizardGroupTargetId) {
  return targetId.startsWith("group-custom:") ? targetId.replace("group-custom:", "") : null;
}

export function getGroupNameByTarget(targetId: WizardGroupTargetId, state: WizardState): string {
  switch (targetId) {
    case "group-default-proxy":
      return state.defaultProxyGroupName;
    case "group-ai-services":
      return state.aiGroupName;
    case "group-streaming":
      return state.streamingGroupName;
    case "group-apple":
      return state.appleGroupName;
    default: {
      const customGroupId = getCustomGroupIdFromTarget(targetId);
      return (
        state.customGroups.find((group) => group.id === customGroupId)?.name ??
        targetId.replace("group-custom:", "")
      );
    }
  }
}

export function targetIdToPolicyRef(
  targetId: WizardPolicyTargetId,
  state: WizardState,
): PolicyRef {
  if (targetId === "builtin:DIRECT") {
    return { kind: "builtin", value: "DIRECT" };
  }

  if (targetId === "builtin:REJECT") {
    return { kind: "builtin", value: "REJECT" };
  }

  return { kind: "group", value: getGroupNameByTarget(targetId, state) };
}

export function policyRefToTargetId(
  policy: PolicyRef,
  state: WizardState,
): WizardPolicyTargetId {
  if (policy.kind === "builtin") {
    return `builtin:${policy.value}` as WizardPolicyTargetId;
  }

  if (policy.value === state.aiGroupName) {
    return "group-ai-services";
  }

  if (policy.value === state.streamingGroupName) {
    return "group-streaming";
  }

  if (policy.value === state.appleGroupName) {
    return "group-apple";
  }

  const customGroup = state.customGroups.find((group) => group.name === policy.value);
  if (customGroup) {
    return `group-custom:${customGroup.id}`;
  }

  return "group-default-proxy";
}

function includesAny(value: string, keywords: string[]) {
  return keywords.some((keyword) => value.includes(keyword));
}

export function suggestTargetForPreset(preset: PresetPack): WizardPolicyTargetId {
  const id = preset.id.toLowerCase();
  const category = preset.category;

  if (id.includes("cn-direct")) {
    return "builtin:DIRECT";
  }

  if (id.includes("adblock")) {
    return "builtin:REJECT";
  }

  if (category === "ai" || includesAny(id, ["openai", "claude", "gemini", "anthropic"])) {
    return "group-ai-services";
  }

  if (category === "streaming" || includesAny(id, ["netflix", "youtube", "spotify"])) {
    return "group-streaming";
  }

  if (category === "ecosystem" || id.includes("apple")) {
    return "group-apple";
  }

  return "group-default-proxy";
}

export function suggestTargetForRemoteRule(item: MetaRulesDatRemoteItem): WizardPolicyTargetId {
  const key = item.name.toLowerCase();

  if (includesAny(key, ["cn", "private", "lan", "local", "localhost"])) {
    return "builtin:DIRECT";
  }

  if (includesAny(key, ["ads", "ad", "advert"])) {
    return "builtin:REJECT";
  }

  if (includesAny(key, ["openai", "claude", "gemini", "anthropic", "copilot"])) {
    return "group-ai-services";
  }

  if (includesAny(key, ["apple", "icloud", "appstore", "applemusic"])) {
    return "group-apple";
  }

  if (includesAny(key, ["netflix", "youtube", "spotify", "disney", "hbo", "primevideo"])) {
    return "group-streaming";
  }

  return "group-default-proxy";
}

export function getPolicyTargetLabel(
  targetId: WizardPolicyTargetId,
  state: WizardState,
  language: AppLanguage,
): string {
  if (targetId === "builtin:DIRECT") {
    return language === "zh" ? "直连 DIRECT" : "DIRECT";
  }

  if (targetId === "builtin:REJECT") {
    return language === "zh" ? "拦截 REJECT" : "REJECT";
  }

  return getGroupNameByTarget(targetId, state);
}

export function getPolicyTargetOptions(state: WizardState, language: AppLanguage) {
  const options: Array<{ id: WizardPolicyTargetId; label: string }> = [
    { id: "group-default-proxy", label: state.defaultProxyGroupName },
    { id: "group-ai-services", label: state.aiGroupName },
    { id: "group-streaming", label: state.streamingGroupName },
    { id: "group-apple", label: state.appleGroupName },
    ...state.customGroups.map((group) => ({
      id: `group-custom:${group.id}` as const,
      label: group.name,
    })),
    {
      id: "builtin:DIRECT",
      label: language === "zh" ? "直连 DIRECT" : "DIRECT",
    },
    {
      id: "builtin:REJECT",
      label: language === "zh" ? "拦截 REJECT" : "REJECT",
    },
  ];

  return options;
}

export function getActiveGroupTargetIds(state: WizardState): WizardGroupTargetId[] {
  const active = new Set<WizardGroupTargetId>(["group-default-proxy"]);

  Object.values(state.ruleAssignments).forEach((target) => {
    if (isGroupTargetId(target)) {
      active.add(target);
    }
  });

  if (isGroupTargetId(state.customDomainTarget)) {
    active.add(state.customDomainTarget);
  }

  if (isGroupTargetId(state.processTarget)) {
    active.add(state.processTarget);
  }

  return [
    ...namedGroupTargetIds.filter((targetId) => active.has(targetId)),
    ...state.customGroups
      .map((group) => `group-custom:${group.id}` as const)
      .filter((targetId) => active.has(targetId)),
  ];
}

export function createCustomGroupName(index: number, language: AppLanguage) {
  return language === "zh" ? `自定义策略组 ${index}` : `Custom Group ${index}`;
}

export function createCustomGroupId(existingGroups: WizardCustomGroup[]) {
  return `cg-${existingGroups.length + 1}-${Date.now().toString(36)}`;
}
