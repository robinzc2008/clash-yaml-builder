import { buildDefaultRegionGroups } from "../../core/presets/regionPresets";
import type { WizardState } from "./types";

const defaultRegions = buildDefaultRegionGroups("zh");
const allRegionIds = defaultRegions.map((r) => r.id);

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
  remoteRuleAliases: {},
  ruleAssignments: {
    "preset:preset-cn-direct": "builtin:DIRECT",
    "preset:preset-ai-routing": "group-ai-services",
    "preset:preset-github": "group-default-proxy",
    "preset:preset-streaming": "group-streaming",
  },
  defaultProxyGroupName: "🚀 默认代理",
  aiGroupName: "🤖 AI",
  streamingGroupName: "📹 流媒体",
  appleGroupName: "🍎 Apple",
  customGroups: [],
  finalPolicyMode: "default-proxy",
  enableLanDirect: true,
  lanCidr: "192.168.1.0/24",
  processRules: [
    {
      id: "process-rule-1",
      processName: "Telegram.exe",
      target: "group-default-proxy",
    },
  ],
  customDomainRules: [
    {
      id: "domain-rule-1",
      domain: "github.com",
      target: "group-default-proxy",
    },
    {
      id: "domain-rule-2",
      domain: "claude.ai",
      target: "group-ai-services",
    },
  ],
  subscriptions: [
    { id: "sub-1", name: "airport1", url: "" },
  ],
  regionGroups: defaultRegions,
  serviceGroupRegions: {
    "group-default-proxy": allRegionIds,
    "group-ai-services": allRegionIds,
    "group-streaming": allRegionIds,
    "group-apple": allRegionIds,
  },
};
