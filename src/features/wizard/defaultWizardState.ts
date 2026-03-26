import type { WizardState } from "./types";

export const defaultWizardState: WizardState = {
  language: "zh",
  projectName: "Home Routing Project",
  target: "openclash",
  mode: "simple",
  selectedPresetIds: [
    "preset-cn-direct",
    "preset-ai-routing",
    "preset-github",
    "preset-streaming",
  ],
  defaultProxyGroupName: "Default Proxy",
  aiGroupName: "AI Services",
  streamingGroupName: "Streaming",
  appleGroupName: "Apple",
  finalPolicyMode: "default-proxy",
  enableLanDirect: true,
  lanCidr: "192.168.1.0/24",
  processName: "Telegram.exe",
  customDomains: "github.com\nclaude.ai",
};
