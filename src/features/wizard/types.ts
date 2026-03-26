import type { TargetPlatform } from "../../core/model/types";

export interface WizardState {
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
