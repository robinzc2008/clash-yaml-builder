import type { TargetPlatform } from "../../core/model/types";

export interface WizardState {
  projectName: string;
  target: TargetPlatform;
  mode: "simple" | "advanced";
  selectedPresetIds: string[];
  enableLanDirect: boolean;
  lanCidr: string;
  processName: string;
  customDomains: string;
}
