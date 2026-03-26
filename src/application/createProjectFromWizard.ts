import type {
  BuilderProject,
  GroupSpec,
  ProxyProviderSpec,
  RuleProviderSpec,
  RuleSpec,
  TargetPlatform,
} from "../core/model/types";
import { presetPacks } from "../core/presets/presetPacks";
import type { WizardState } from "../features/wizard/types";

function buildBaseGroups(target: TargetPlatform): GroupSpec[] {
  const defaults: GroupSpec[] = [
    {
      id: "group-default-proxy",
      name: "Default Proxy",
      type: "select",
      members: [
        { kind: "builtin", value: "DIRECT" },
        { kind: "proxy-provider", ref: "provider-main" },
      ],
    },
  ];

  if (target === "windows-mihomo") {
    defaults.push({
      id: "group-app-routing",
      name: "App Routing",
      type: "select",
      members: [
        { kind: "group", ref: "group-default-proxy" },
        { kind: "builtin", value: "DIRECT" },
      ],
    });
  }

  return defaults;
}

function buildBaseProxyProviders(): ProxyProviderSpec[] {
  return [
    {
      id: "provider-main",
      name: "MainProvider",
      sourceType: "http",
      url: "https://example.com/subscription.yaml",
      interval: 3600,
    },
  ];
}

function mergeUniqueById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);
    return true;
  });
}

function buildLanRule(lanCidr: string): RuleSpec {
  return {
    id: "rule-lan-direct",
    match: {
      kind: "src_ip_cidr",
      value: lanCidr,
    },
    policy: { kind: "builtin", value: "DIRECT" },
    priority: 10,
    enabled: true,
    comment: "Keep LAN traffic direct.",
  };
}

function buildProcessRule(processName: string): RuleSpec | null {
  const trimmed = processName.trim();
  if (!trimmed) {
    return null;
  }

  return {
    id: "rule-process-app",
    match: {
      kind: "process_name",
      value: trimmed,
    },
    policy: { kind: "group", value: "App Routing" },
    priority: 30,
    enabled: true,
    comment: "Route the selected desktop app through a dedicated group.",
  };
}

function buildCustomDomainRules(domains: string): RuleSpec[] {
  return domains
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((domain, index) => ({
      id: `rule-custom-domain-${index + 1}`,
      match: { kind: "domain_suffix" as const, value: domain },
      policy: { kind: "group" as const, value: "Default Proxy" },
      priority: 200 + index,
      enabled: true,
      comment: "Custom domain routing.",
    }));
}

export function createProjectFromWizard(state: WizardState): BuilderProject {
  const now = new Date().toISOString();
  const selectedPresets = presetPacks.filter((preset) =>
    state.selectedPresetIds.includes(preset.id),
  );

  const groups = mergeUniqueById([
    ...buildBaseGroups(state.target),
    ...selectedPresets.flatMap((preset) => preset.groups),
  ]);

  const proxyProviders = buildBaseProxyProviders();

  const ruleProviders = mergeUniqueById<RuleProviderSpec>([
    ...selectedPresets.flatMap((preset) => preset.ruleProviders),
  ]);

  const rules = mergeUniqueById<RuleSpec>([
    ...(state.enableLanDirect ? [buildLanRule(state.lanCidr)] : []),
    ...selectedPresets.flatMap((preset) => preset.rules),
    ...buildCustomDomainRules(state.customDomains),
    ...(state.target === "windows-mihomo"
      ? [buildProcessRule(state.processName)].filter(
          (rule): rule is RuleSpec => Boolean(rule),
        )
      : []),
    {
      id: "rule-final-match",
      match: { kind: "match" },
      policy: { kind: "group", value: "Default Proxy" },
      priority: 9999,
      enabled: true,
      comment: "Final fallback.",
    },
  ]);

  return {
    version: 1,
    meta: {
      name: state.projectName.trim() || "Untitled Routing Project",
      target: state.target,
      mode: state.mode,
      createdAt: now,
      updatedAt: now,
    },
    settings: {
      finalPolicy: { kind: "group", value: "Default Proxy" },
      enableLanDirect: state.enableLanDirect,
      enableAdBlock: state.selectedPresetIds.includes("preset-adblock"),
    },
    groups,
    proxyProviders,
    ruleProviders,
    rules,
    features: [
      {
        key: "future-apple-shell",
        enabled: false,
      },
    ],
  };
}
