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

export interface WizardProcessRule {
  id: string;
  processName: string;
  target: WizardPolicyTargetId;
}

export interface WizardDomainRule {
  id: string;
  domain: string;
  target: WizardPolicyTargetId;
}

export interface WizardState {
  language: AppLanguage;
  projectName: string;
  target: TargetPlatform;
  mode: "simple" | "advanced";
  selectedPresetIds: string[];
  selectedRemoteRuleIds: string[];
  remoteRuleAliases: Record<string, string>;
  ruleAssignments: Record<string, WizardPolicyTargetId>;
  defaultProxyGroupName: string;
  aiGroupName: string;
  streamingGroupName: string;
  appleGroupName: string;
  customGroups: WizardCustomGroup[];
  finalPolicyMode: "default-proxy" | "direct";
  enableLanDirect: boolean;
  lanCidr: string;
  processRules: WizardProcessRule[];
  customDomainRules: WizardDomainRule[];
}
