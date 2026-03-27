import type { AppLanguage, TargetPlatform } from "../../core/model/types";

export type { AppLanguage };

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

/** 用户的机场订阅源 */
export interface WizardSubscription {
  id: string;
  name: string;
  url: string;
}

/** 地区节点组（统一结构，名称/正则/类型全部可编辑） */
export interface WizardRegionGroup {
  id: string;
  /** 显示名称，用户可改（如 "♻️ 香港"） */
  name: string;
  /** 节点名正则过滤（空字符串 = include-all 不过滤） */
  filter: string;
  /** select = 手动选择；url-test = 自动测速选最快 */
  type: "select" | "url-test";
  tolerance: number;
  interval: number;
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
  /** 机场订阅源列表 */
  subscriptions: WizardSubscription[];
  /** 地区节点组（全部可编辑：名称、正则、类型） */
  regionGroups: WizardRegionGroup[];
  /** 每个服务策略组引用哪些地区组 ID（key = groupTargetId） */
  serviceGroupRegions: Record<string, string[]>;
}
