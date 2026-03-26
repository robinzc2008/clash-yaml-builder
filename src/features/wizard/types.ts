import type { TargetPlatform } from "../../core/model/types";

export type AppLanguage = "en" | "zh";

export type WizardPolicyTargetId =
  | "group-default-proxy"
  | "group-ai-services"
  | "group-streaming"
  | "group-apple"
  | `group-custom:${string}`
  | "builtin:DIRECT"
  | "builtin:REJECT";

export interface WizardCustomGroup {
  id: string;
  name: string;
}

export interface WizardState {
  language: AppLanguage;
  projectName: string;
  target: TargetPlatform;
  mode: "simple" | "advanced";
  selectedPresetIds: string[];
  selectedRemoteRuleIds: string[];
  ruleAssignments: Record<string, WizardPolicyTargetId>;
  defaultProxyGroupName: string;
  aiGroupName: string;
  streamingGroupName: string;
  appleGroupName: string;
  customGroups: WizardCustomGroup[];
  finalPolicyMode: "default-proxy" | "direct";
  enableLanDirect: boolean;
  lanCidr: string;
  processName: string;
  processTarget: WizardPolicyTargetId;
  customDomains: string;
  customDomainTarget: WizardPolicyTargetId;
}
