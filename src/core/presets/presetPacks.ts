import type { GroupSpec, RuleProviderSpec, RuleSpec } from "../model/types";
import {
  META_RULES_DAT_REPO,
  metaRulesDatCatalog,
} from "../sources/metaRulesDat";

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
  },
];
