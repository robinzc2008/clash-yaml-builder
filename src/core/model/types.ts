export type AppLanguage = "en" | "zh";

export type TargetPlatform = "openclash" | "windows-mihomo" | "sparkle";

export type MatchKind =
  | "domain"
  | "domain_suffix"
  | "domain_keyword"
  | "ip_cidr"
  | "src_ip_cidr"
  | "process_name"
  | "process_name_regex"
  | "rule_set"
  | "geoip"
  | "match";

export type BuiltinPolicy = "DIRECT" | "REJECT";

export type PolicyRef =
  | { kind: "builtin"; value: BuiltinPolicy }
  | { kind: "group"; value: string };

export type GroupType = "select" | "url-test" | "fallback" | "load-balance";

export type ProviderBehavior = "domain" | "ipcidr" | "classical";
export type ProviderFormat = "yaml" | "text" | "mrs";
export type ProviderSourceType = "http" | "file" | "inline";

export type SupportState = "supported" | "unsupported";

export interface HealthCheckSpec {
  enable: boolean;
  url: string;
  interval: number;
}

export interface GroupSpec {
  id: string;
  name: string;
  type: GroupType;
  members: GroupMember[];
  /** 从所有 proxy-providers 拉取全部节点（地区组用） */
  includeAll?: boolean;
  /** 按节点名正则筛选（地区组用） */
  filter?: string;
  /** url-test/fallback 的延迟容忍度（ms） */
  tolerance?: number;
  /** url-test/fallback 的测速间隔（秒） */
  testInterval?: number;
  /** 测速 URL */
  testUrl?: string;
  platformConstraints?: Partial<Record<TargetPlatform, SupportState>>;
}

export type GroupMember =
  | { kind: "builtin"; value: BuiltinPolicy }
  | { kind: "group"; ref: string }
  | { kind: "proxy-provider"; ref: string }
  | { kind: "proxy"; value: string };

export interface ProxyProviderSpec {
  id: string;
  name: string;
  sourceType: Exclude<ProviderSourceType, "inline">;
  url?: string;
  path?: string;
  interval?: number;
  filter?: string;
  excludeFilter?: string;
  healthCheck?: HealthCheckSpec;
  /** 拉取订阅时走的代理（如 "直连"） */
  fetchProxy?: string;
}

export interface RuleProviderSpec {
  id: string;
  name: string;
  sourceType: ProviderSourceType;
  behavior: ProviderBehavior;
  format?: ProviderFormat;
  url?: string;
  path?: string;
  interval?: number;
  payload?: string[];
  sourceLabel?: string;
  sourceUrl?: string;
}

export interface RuleSpec {
  id: string;
  match: {
    kind: MatchKind;
    value?: string;
    options?: Record<string, string | boolean | number>;
  };
  policy: PolicyRef;
  priority: number;
  enabled: boolean;
  comment?: string;
  platformConstraints?: Partial<Record<TargetPlatform, SupportState>>;
}

export interface FeatureFlag {
  key: string;
  enabled: boolean;
}

export interface BuilderProject {
  version: 1;
  meta: {
    name: string;
    target: TargetPlatform;
    mode: "simple" | "advanced";
    createdAt: string;
    updatedAt: string;
  };
  settings: {
    finalPolicy: PolicyRef;
    enableLanDirect: boolean;
    enableAdBlock: boolean;
  };
  groups: GroupSpec[];
  proxyProviders: ProxyProviderSpec[];
  ruleProviders: RuleProviderSpec[];
  rules: RuleSpec[];
  features: FeatureFlag[];
}

export interface ValidationIssue {
  id: string;
  severity: "error" | "warning";
  message: string;
}

export interface ValidationResult {
  issues: ValidationIssue[];
}

export interface RenderedConfig {
  target: TargetPlatform;
  format: "yaml" | "text";
  content: string;
  warnings: string[];
}
