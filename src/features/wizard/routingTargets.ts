import type { PolicyRef } from "../../core/model/types";
import type { PresetPack } from "../../core/presets/presetPacks";
import type { AppLanguage, WizardPolicyTargetId, WizardState } from "./types";
import type { MetaRulesDatRemoteItem } from "../../core/sources/metaRulesDat";

export const namedGroupTargetIds = [
  "group-default-proxy",
  "group-ai-services",
  "group-streaming",
  "group-apple",
] as const;

export type NamedGroupTargetId = (typeof namedGroupTargetIds)[number];

export function isNamedGroupTargetId(value: WizardPolicyTargetId): value is NamedGroupTargetId {
  return namedGroupTargetIds.includes(value as NamedGroupTargetId);
}

export function getGroupNameByTarget(targetId: NamedGroupTargetId, state: WizardState): string {
  switch (targetId) {
    case "group-default-proxy":
      return state.defaultProxyGroupName;
    case "group-ai-services":
      return state.aiGroupName;
    case "group-streaming":
      return state.streamingGroupName;
    case "group-apple":
      return state.appleGroupName;
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

export function getActiveGroupTargetIds(state: WizardState): NamedGroupTargetId[] {
  const active = new Set<NamedGroupTargetId>(["group-default-proxy"]);

  Object.values(state.ruleAssignments).forEach((target) => {
    if (isNamedGroupTargetId(target)) {
      active.add(target);
    }
  });

  if (isNamedGroupTargetId(state.customDomainTarget)) {
    active.add(state.customDomainTarget);
  }

  if (isNamedGroupTargetId(state.processTarget)) {
    active.add(state.processTarget);
  }

  return namedGroupTargetIds.filter((targetId) => active.has(targetId));
}
