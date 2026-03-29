import { buildDefaultRegionGroups } from "../../core/presets/regionPresets";
import type { WizardState } from "./types";

const defaultRegions = buildDefaultRegionGroups("zh").filter((region) =>
  ["region-manual", "region-hk", "region-jp", "region-us", "region-sg"].includes(region.id),
);
const allRegionIds = defaultRegions.map((r) => r.id);

export const defaultWizardState: WizardState = {
  language: "zh",
  projectName: "家庭分流方案",
  target: "sparkle",
  mode: "simple",
  selectedPresetIds: [
    "preset-cn-direct",
    "preset-ai-routing",
    "preset-streaming",
  ],
  selectedRemoteRuleIds: [],
  remoteRuleAliases: {},
  ruleAssignments: {
    "preset:preset-cn-direct": "builtin:DIRECT",
    "preset:preset-ai-routing": "group-ai-services",
    "preset:preset-streaming": "group-streaming",
  },
  defaultProxyGroupName: "🚀 默认代理",
  aiGroupName: "🤖 AI",
  streamingGroupName: "📺 流媒体",
  appleGroupName: "🍎 Apple",
  removedPresetGroupIds: [],
  customGroups: [],
  finalPolicyMode: "default-proxy",
  enableLanDirect: true,
  lanCidr: "192.168.1.0/24",
  processRules: [],
  customDomainRules: [],
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
