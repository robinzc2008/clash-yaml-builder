import type { TargetPlatform } from "../../core/model/types";

export interface TargetDefinition {
  id: TargetPlatform;
  title: string;
  summary: string;
  idealFor: string;
}

export const targetDefinitions: TargetDefinition[] = [
  {
    id: "openclash",
    title: "OpenClash Router",
    summary: "Best for routing by service, domain, device IP, and home network scenarios.",
    idealFor: "Home routers, NAS setups, and family-wide traffic policies.",
  },
  {
    id: "windows-mihomo",
    title: "Windows Clash or Mihomo",
    summary: "Adds client-side flexibility, including future process-aware flows.",
    idealFor: "Desktop users who want app-aware and service-aware routing.",
  },
  {
    id: "sparkle",
    title: "Sparkle",
    summary: "Keeps a dedicated export target for Sparkle-style configs and future compatibility work.",
    idealFor: "Users who want a separate target instead of hand-tuning YAML.",
  },
];
