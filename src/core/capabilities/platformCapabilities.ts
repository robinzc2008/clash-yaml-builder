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
  openclash: {
    target: "openclash",
    label: "OpenClash Router",
    supports: {
      processRule: false,
      srcIpRule: true,
      ruleProvider: true,
      proxyProvider: true,
      inlineProvider: true,
      mrsFormat: true,
    },
    groupTypes: ["select", "url-test", "fallback", "load-balance"],
    builtinPolicies: ["DIRECT", "REJECT"],
  },
  "windows-mihomo": {
    target: "windows-mihomo",
    label: "Windows Clash or Mihomo Client",
    supports: {
      processRule: true,
      srcIpRule: true,
      ruleProvider: true,
      proxyProvider: true,
      inlineProvider: true,
      mrsFormat: true,
    },
    groupTypes: ["select", "url-test", "fallback", "load-balance"],
    builtinPolicies: ["DIRECT", "REJECT"],
  },
  sparkle: {
    target: "sparkle",
    label: "Sparkle-Compatible Target",
    supports: {
      processRule: false,
      srcIpRule: true,
      ruleProvider: true,
      proxyProvider: true,
      inlineProvider: true,
      mrsFormat: false,
    },
    groupTypes: ["select", "url-test", "fallback", "load-balance"],
    builtinPolicies: ["DIRECT", "REJECT"],
  },
};
