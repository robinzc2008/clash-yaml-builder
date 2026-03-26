import type { WizardState } from "./types";

export const defaultWizardState: WizardState = {
  language: "zh",
  projectName: "家庭分流方案",
  target: "openclash",
  mode: "simple",
  selectedPresetIds: [
    "preset-cn-direct",
    "preset-ai-routing",
    "preset-github",
    "preset-streaming",
  ],
  selectedRemoteRuleIds: [],
  ruleAssignments: {
    "preset:preset-cn-direct": "builtin:DIRECT",
    "preset:preset-ai-routing": "group-ai-services",
    "preset:preset-github": "group-default-proxy",
    "preset:preset-streaming": "group-streaming",
  },
  defaultProxyGroupName: "Default Proxy",
  aiGroupName: "AI Services",
  streamingGroupName: "Streaming",
  appleGroupName: "Apple",
  customGroups: [],
  finalPolicyMode: "default-proxy",
  enableLanDirect: true,
  lanCidr: "192.168.1.0/24",
  processName: "Telegram.exe",
  processTarget: "group-default-proxy",
  customDomains: "github.com\nclaude.ai",
  customDomainTarget: "group-default-proxy",
};
