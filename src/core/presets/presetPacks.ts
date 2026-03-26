import type { GroupSpec, RuleProviderSpec, RuleSpec } from "../model/types";
import {
  META_RULES_DAT_REPO,
  metaRulesDatCatalog,
} from "../sources/metaRulesDat";
import type { AppLanguage } from "../../features/wizard/types";

export interface PresetPack {
  id: string;
  name: string;
  category:
    | "foundation"
    | "ai"
    | "work"
    | "streaming"
    | "communication"
    | "ecosystem"
    | "security";
  style?: "bundle" | "service";
  description: string;
  supportedTargets: Array<"openclash" | "windows-mihomo" | "sparkle">;
  groups: GroupSpec[];
  ruleProviders: RuleProviderSpec[];
  rules: RuleSpec[];
  sourceLabel?: string;
  sourceUrl?: string;
  i18n?: Partial<Record<AppLanguage, { name: string; description: string }>>;
}

export const presetPacks: PresetPack[] = [
  {
    id: "preset-cn-direct",
    name: "China Direct",
    category: "foundation",
    style: "bundle",
    description: "Uses the upstream CN geosite ruleset for direct routing.",
    supportedTargets: ["openclash", "windows-mihomo", "sparkle"],
    sourceLabel: "MetaCubeX meta-rules-dat",
    sourceUrl: META_RULES_DAT_REPO,
    groups: [],
    ruleProviders: [
      {
        id: "preset-rule-provider-cn",
        name: "China Direct",
        sourceType: "http",
        behavior: "domain",
        format: "yaml",
        interval: 86400,
        url: metaRulesDatCatalog.cn.url,
        sourceLabel: "MetaCubeX geosite:cn",
        sourceUrl: META_RULES_DAT_REPO,
      },
    ],
    rules: [
      {
        id: "preset-rule-cn-direct",
        match: { kind: "rule_set", value: "China Direct" },
        policy: { kind: "builtin", value: "DIRECT" },
        priority: 12,
        enabled: true,
      },
    ],
    i18n: {
      zh: {
        name: "中国大陆直连",
        description: "使用上游 CN geosite 规则集做大陆站点直连。",
      },
    },
  },
  {
    id: "preset-ai-routing",
    name: "AI Services",
    category: "ai",
    style: "bundle",
    description: "Routes mainstream AI services through a dedicated policy group.",
    supportedTargets: ["openclash", "windows-mihomo", "sparkle"],
    sourceLabel: "MetaCubeX meta-rules-dat",
    sourceUrl: META_RULES_DAT_REPO,
    groups: [
      {
        id: "group-ai-services",
        name: "AI Services",
        type: "select",
        members: [
          { kind: "group", ref: "group-default-proxy" },
          { kind: "builtin", value: "DIRECT" },
        ],
      },
    ],
    ruleProviders: [
      {
        id: "preset-rule-provider-ai",
        name: "AI",
        sourceType: "http",
        behavior: "domain",
        format: "yaml",
        interval: 86400,
        url: metaRulesDatCatalog.openai.url,
        sourceLabel: "MetaCubeX geosite:openai",
        sourceUrl: META_RULES_DAT_REPO,
      },
    ],
    rules: [
      {
        id: "preset-rule-ai",
        match: { kind: "rule_set", value: "AI" },
        policy: { kind: "group", value: "AI Services" },
        priority: 50,
        enabled: true,
      },
    ],
    i18n: {
      zh: {
        name: "AI 服务包",
        description: "把主流 AI 服务统一导向单独的 AI 策略组。",
      },
    },
  },
  {
    id: "preset-openai",
    name: "OpenAI",
    category: "ai",
    style: "service",
    description: "Routes OpenAI domains through a dedicated AI policy group.",
    supportedTargets: ["openclash", "windows-mihomo", "sparkle"],
    sourceLabel: "MetaCubeX meta-rules-dat",
    sourceUrl: META_RULES_DAT_REPO,
    groups: [
      {
        id: "group-ai-services",
        name: "AI Services",
        type: "select",
        members: [
          { kind: "group", ref: "group-default-proxy" },
          { kind: "builtin", value: "DIRECT" },
        ],
      },
    ],
    ruleProviders: [
      {
        id: "preset-rule-provider-openai",
        name: "OpenAI",
        sourceType: "http",
        behavior: "domain",
        format: "yaml",
        interval: 86400,
        url: metaRulesDatCatalog.openai.url,
        sourceLabel: "MetaCubeX geosite:openai",
        sourceUrl: META_RULES_DAT_REPO,
      },
    ],
    rules: [
      {
        id: "preset-rule-openai",
        match: { kind: "rule_set", value: "OpenAI" },
        policy: { kind: "group", value: "AI Services" },
        priority: 51,
        enabled: true,
      },
    ],
    i18n: {
      zh: {
        name: "OpenAI",
        description: "将 OpenAI 域名导向专用 AI 策略组。",
      },
    },
  },
  {
    id: "preset-claude",
    name: "Claude",
    category: "ai",
    style: "service",
    description: "Routes Claude and Anthropic domains through the AI policy group.",
    supportedTargets: ["openclash", "windows-mihomo", "sparkle"],
    groups: [
      {
        id: "group-ai-services",
        name: "AI Services",
        type: "select",
        members: [
          { kind: "group", ref: "group-default-proxy" },
          { kind: "builtin", value: "DIRECT" },
        ],
      },
    ],
    ruleProviders: [
      {
        id: "preset-rule-provider-claude",
        name: "Claude",
        sourceType: "inline",
        behavior: "classical",
        payload: [
          "DOMAIN-SUFFIX,claude.ai",
          "DOMAIN-SUFFIX,anthropic.com",
        ],
        sourceLabel: "Built-in inline domains",
      },
    ],
    rules: [
      {
        id: "preset-rule-claude",
        match: { kind: "rule_set", value: "Claude" },
        policy: { kind: "group", value: "AI Services" },
        priority: 52,
        enabled: true,
      },
    ],
    i18n: {
      zh: {
        name: "Claude",
        description: "将 Claude 和 Anthropic 域名导向 AI 策略组。",
      },
    },
  },
  {
    id: "preset-gemini",
    name: "Gemini",
    category: "ai",
    style: "service",
    description: "Routes Gemini domains through the AI policy group.",
    supportedTargets: ["openclash", "windows-mihomo", "sparkle"],
    groups: [
      {
        id: "group-ai-services",
        name: "AI Services",
        type: "select",
        members: [
          { kind: "group", ref: "group-default-proxy" },
          { kind: "builtin", value: "DIRECT" },
        ],
      },
    ],
    ruleProviders: [
      {
        id: "preset-rule-provider-gemini",
        name: "Gemini",
        sourceType: "inline",
        behavior: "classical",
        payload: [
          "DOMAIN-SUFFIX,gemini.google.com",
          "DOMAIN-SUFFIX,bard.google.com",
          "DOMAIN-SUFFIX,deepmind.google",
        ],
        sourceLabel: "Built-in inline domains",
      },
    ],
    rules: [
      {
        id: "preset-rule-gemini",
        match: { kind: "rule_set", value: "Gemini" },
        policy: { kind: "group", value: "AI Services" },
        priority: 53,
        enabled: true,
      },
    ],
    i18n: {
      zh: {
        name: "Gemini",
        description: "将 Gemini 相关域名导向 AI 策略组。",
      },
    },
  },
  {
    id: "preset-github",
    name: "GitHub",
    category: "work",
    style: "service",
    description: "Routes GitHub domains through the default proxy group.",
    supportedTargets: ["openclash", "windows-mihomo", "sparkle"],
    sourceLabel: "MetaCubeX meta-rules-dat",
    sourceUrl: META_RULES_DAT_REPO,
    groups: [],
    ruleProviders: [
      {
        id: "preset-rule-provider-github",
        name: "GitHub",
        sourceType: "http",
        behavior: "domain",
        format: "yaml",
        interval: 86400,
        url: metaRulesDatCatalog.github.url,
        sourceLabel: "MetaCubeX geosite:github",
        sourceUrl: META_RULES_DAT_REPO,
      },
    ],
    rules: [
      {
        id: "preset-rule-github",
        match: { kind: "rule_set", value: "GitHub" },
        policy: { kind: "group", value: "Default Proxy" },
        priority: 70,
        enabled: true,
      },
    ],
    i18n: {
      zh: {
        name: "GitHub",
        description: "将 GitHub 相关域名导向默认代理组。",
      },
    },
  },
  {
    id: "preset-google",
    name: "Google",
    category: "work",
    style: "service",
    description: "Routes Google search and service domains through the default proxy group.",
    supportedTargets: ["openclash", "windows-mihomo", "sparkle"],
    sourceLabel: "MetaCubeX meta-rules-dat",
    sourceUrl: META_RULES_DAT_REPO,
    groups: [],
    ruleProviders: [
      {
        id: "preset-rule-provider-google",
        name: "Google",
        sourceType: "http",
        behavior: "domain",
        format: "yaml",
        interval: 86400,
        url: metaRulesDatCatalog.google.url,
        sourceLabel: "MetaCubeX geosite:google",
        sourceUrl: META_RULES_DAT_REPO,
      },
    ],
    rules: [
      {
        id: "preset-rule-google",
        match: { kind: "rule_set", value: "Google" },
        policy: { kind: "group", value: "Default Proxy" },
        priority: 71,
        enabled: true,
      },
    ],
    i18n: {
      zh: {
        name: "Google",
        description: "将 Google 搜索及其服务域名导向默认代理组。",
      },
    },
  },
  {
    id: "preset-streaming",
    name: "Streaming",
    category: "streaming",
    style: "bundle",
    description: "Creates a dedicated group for mainstream streaming services.",
    supportedTargets: ["openclash", "windows-mihomo", "sparkle"],
    sourceLabel: "MetaCubeX meta-rules-dat",
    sourceUrl: META_RULES_DAT_REPO,
    groups: [
      {
        id: "group-streaming",
        name: "Streaming",
        type: "select",
        members: [
          { kind: "group", ref: "group-default-proxy" },
          { kind: "builtin", value: "DIRECT" },
        ],
      },
    ],
    ruleProviders: [
      {
        id: "preset-rule-provider-netflix",
        name: "Netflix",
        sourceType: "http",
        behavior: "domain",
        format: "yaml",
        interval: 86400,
        url: metaRulesDatCatalog.netflix.url,
        sourceLabel: "MetaCubeX geosite:netflix",
        sourceUrl: META_RULES_DAT_REPO,
      },
      {
        id: "preset-rule-provider-youtube",
        name: "YouTube",
        sourceType: "http",
        behavior: "domain",
        format: "yaml",
        interval: 86400,
        url: metaRulesDatCatalog.youtube.url,
        sourceLabel: "MetaCubeX geosite:youtube",
        sourceUrl: META_RULES_DAT_REPO,
      },
    ],
    rules: [
      {
        id: "preset-rule-streaming-netflix",
        match: { kind: "rule_set", value: "Netflix" },
        policy: { kind: "group", value: "Streaming" },
        priority: 60,
        enabled: true,
      },
      {
        id: "preset-rule-streaming-youtube",
        match: { kind: "rule_set", value: "YouTube" },
        policy: { kind: "group", value: "Streaming" },
        priority: 61,
        enabled: true,
      },
    ],
    i18n: {
      zh: {
        name: "流媒体包",
        description: "为主流流媒体服务创建独立策略组。",
      },
    },
  },
  {
    id: "preset-netflix",
    name: "Netflix",
    category: "streaming",
    style: "service",
    description: "Routes Netflix domains through the streaming policy group.",
    supportedTargets: ["openclash", "windows-mihomo", "sparkle"],
    sourceLabel: "MetaCubeX meta-rules-dat",
    sourceUrl: META_RULES_DAT_REPO,
    groups: [
      {
        id: "group-streaming",
        name: "Streaming",
        type: "select",
        members: [
          { kind: "group", ref: "group-default-proxy" },
          { kind: "builtin", value: "DIRECT" },
        ],
      },
    ],
    ruleProviders: [
      {
        id: "preset-rule-provider-netflix-single",
        name: "Netflix",
        sourceType: "http",
        behavior: "domain",
        format: "yaml",
        interval: 86400,
        url: metaRulesDatCatalog.netflix.url,
        sourceLabel: "MetaCubeX geosite:netflix",
        sourceUrl: META_RULES_DAT_REPO,
      },
    ],
    rules: [
      {
        id: "preset-rule-netflix",
        match: { kind: "rule_set", value: "Netflix" },
        policy: { kind: "group", value: "Streaming" },
        priority: 62,
        enabled: true,
      },
    ],
    i18n: {
      zh: {
        name: "Netflix",
        description: "将 Netflix 域名导向流媒体策略组。",
      },
    },
  },
  {
    id: "preset-youtube",
    name: "YouTube",
    category: "streaming",
    style: "service",
    description: "Routes YouTube domains through the streaming policy group.",
    supportedTargets: ["openclash", "windows-mihomo", "sparkle"],
    sourceLabel: "MetaCubeX meta-rules-dat",
    sourceUrl: META_RULES_DAT_REPO,
    groups: [
      {
        id: "group-streaming",
        name: "Streaming",
        type: "select",
        members: [
          { kind: "group", ref: "group-default-proxy" },
          { kind: "builtin", value: "DIRECT" },
        ],
      },
    ],
    ruleProviders: [
      {
        id: "preset-rule-provider-youtube-single",
        name: "YouTube",
        sourceType: "http",
        behavior: "domain",
        format: "yaml",
        interval: 86400,
        url: metaRulesDatCatalog.youtube.url,
        sourceLabel: "MetaCubeX geosite:youtube",
        sourceUrl: META_RULES_DAT_REPO,
      },
    ],
    rules: [
      {
        id: "preset-rule-youtube",
        match: { kind: "rule_set", value: "YouTube" },
        policy: { kind: "group", value: "Streaming" },
        priority: 63,
        enabled: true,
      },
    ],
    i18n: {
      zh: {
        name: "YouTube",
        description: "将 YouTube 域名导向流媒体策略组。",
      },
    },
  },
  {
    id: "preset-telegram",
    name: "Telegram",
    category: "communication",
    style: "service",
    description: "Routes Telegram domains through the default proxy group.",
    supportedTargets: ["openclash", "windows-mihomo", "sparkle"],
    sourceLabel: "MetaCubeX meta-rules-dat",
    sourceUrl: META_RULES_DAT_REPO,
    groups: [],
    ruleProviders: [
      {
        id: "preset-rule-provider-telegram",
        name: "Telegram",
        sourceType: "http",
        behavior: "domain",
        format: "yaml",
        interval: 86400,
        url: metaRulesDatCatalog.telegram.url,
        sourceLabel: "MetaCubeX geosite:telegram",
        sourceUrl: META_RULES_DAT_REPO,
      },
    ],
    rules: [
      {
        id: "preset-rule-telegram",
        match: { kind: "rule_set", value: "Telegram" },
        policy: { kind: "group", value: "Default Proxy" },
        priority: 72,
        enabled: true,
      },
    ],
    i18n: {
      zh: {
        name: "Telegram",
        description: "将 Telegram 域名导向默认代理组。",
      },
    },
  },
  {
    id: "preset-apple",
    name: "Apple",
    category: "ecosystem",
    style: "service",
    description: "Adds an Apple-focused ruleset for clients that need Apple services split out separately.",
    supportedTargets: ["openclash", "windows-mihomo", "sparkle"],
    sourceLabel: "MetaCubeX meta-rules-dat",
    sourceUrl: META_RULES_DAT_REPO,
    groups: [
      {
        id: "group-apple",
        name: "Apple",
        type: "select",
        members: [
          { kind: "builtin", value: "DIRECT" },
          { kind: "group", ref: "group-default-proxy" },
        ],
      },
    ],
    ruleProviders: [
      {
        id: "preset-rule-provider-apple",
        name: "Apple",
        sourceType: "http",
        behavior: "domain",
        format: "yaml",
        interval: 86400,
        url: metaRulesDatCatalog.apple.url,
        sourceLabel: "MetaCubeX geosite:apple",
        sourceUrl: META_RULES_DAT_REPO,
      },
    ],
    rules: [
      {
        id: "preset-rule-apple",
        match: { kind: "rule_set", value: "Apple" },
        policy: { kind: "group", value: "Apple" },
        priority: 73,
        enabled: true,
      },
    ],
    i18n: {
      zh: {
        name: "Apple",
        description: "为 Apple 相关服务增加独立分流策略。",
      },
    },
  },
  {
    id: "preset-adblock",
    name: "Ad Block",
    category: "security",
    style: "bundle",
    description: "Adds a simple reject ruleset for ad domains.",
    supportedTargets: ["openclash", "windows-mihomo", "sparkle"],
    groups: [],
    ruleProviders: [
      {
        id: "preset-rule-provider-adblock",
        name: "Ads",
        sourceType: "inline",
        behavior: "classical",
        payload: [
          "DOMAIN-SUFFIX,doubleclick.net",
          "DOMAIN-SUFFIX,googlesyndication.com",
          "DOMAIN-SUFFIX,googletagmanager.com",
          "DOMAIN-SUFFIX,adservice.google.com",
        ],
      },
    ],
    rules: [
      {
        id: "preset-rule-adblock",
        match: { kind: "rule_set", value: "Ads" },
        policy: { kind: "builtin", value: "REJECT" },
        priority: 15,
        enabled: true,
      },
    ],
    i18n: {
      zh: {
        name: "广告拦截",
        description: "加入一个简单的广告域名拒绝规则集。",
      },
    },
  },
];
