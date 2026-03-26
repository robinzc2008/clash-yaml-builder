import type { TargetPlatform } from "../../core/model/types";

export type AppLanguage = "en" | "zh";

export interface WizardState {
  language: AppLanguage;
  projectName: string;
  target: TargetPlatform;
  mode: "simple" | "advanced";
  selectedPresetIds: string[];
  defaultProxyGroupName: string;
  aiGroupName: string;
  streamingGroupName: string;
  appleGroupName: string;
  finalPolicyMode: "default-proxy" | "direct";
  enableLanDirect: boolean;
  lanCidr: string;
  processName: string;
  customDomains: string;
}
