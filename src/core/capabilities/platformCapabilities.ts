import type { GroupType, TargetPlatform } from "../model/types";

export interface PlatformCapability {
  target: TargetPlatform;
  label: string;
  supports: {
    processRule: boolean;
    srcIpRule: boolean;
    ruleProvider: boolean;
    proxyProvider: boolean;
    inlineProvider: boolean;
    mrsFormat: boolean;
  };
  groupTypes: GroupType[];
  builtinPolicies: Array<"DIRECT" | "REJECT">;
}

export const platformCapabilities: Record<TargetPlatform, PlatformCapability> = {
  "windows-mihomo": {
    target: "windows-mihomo",
    label: "Clash (Windows client)",
    supports: {
      processRule: true,
      srcIpRule: true,
      ruleProvider: true,
      proxyProvider: true,
      inlineProvider: false,
      mrsFormat: true,
    },
    groupTypes: ["select", "url-test", "fallback", "load-balance"],
    builtinPolicies: ["DIRECT", "REJECT"],
  },
  sparkle: {
    target: "sparkle",
    label: "Sparkle",
    supports: {
      processRule: false,
      srcIpRule: true,
      ruleProvider: true,
      proxyProvider: true,
      inlineProvider: false,
      mrsFormat: false,
    },
    groupTypes: ["select", "url-test", "fallback", "load-balance"],
    builtinPolicies: ["DIRECT", "REJECT"],
  },
};
