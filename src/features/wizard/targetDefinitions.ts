import type { TargetPlatform } from "../../core/model/types";
import type { AppLanguage } from "./types";

export interface TargetDefinition {
  id: TargetPlatform;
  title: string;
  summary: string;
  idealFor: string;
  i18n?: Partial<Record<AppLanguage, { title: string; summary: string; idealFor: string }>>;
}

export const targetDefinitions: TargetDefinition[] = [
  {
    id: "openclash",
    title: "OpenClash Router",
    summary: "Best for routing by service, domain, device IP, and home network scenarios.",
    idealFor: "Home routers, NAS setups, and family-wide traffic policies.",
    i18n: {
      zh: {
        title: "OpenClash 路由器",
        summary: "适合按服务、域名、设备 IP 和家庭网络场景来做分流。",
        idealFor: "家庭路由器、NAS 场景，以及全家设备统一策略。",
      },
    },
  },
  {
    id: "windows-mihomo",
    title: "Windows Clash or Mihomo",
    summary: "Adds client-side flexibility, including future process-aware flows.",
    idealFor: "Desktop users who want app-aware and service-aware routing.",
    i18n: {
      zh: {
        title: "Windows Clash / Mihomo",
        summary: "客户端侧更灵活，也更适合做按进程和按服务同时分流。",
        idealFor: "需要按应用和按服务同步分流的桌面用户。",
      },
    },
  },
  {
    id: "sparkle",
    title: "Sparkle",
    summary:
      "Keeps a dedicated export target for Sparkle-style configs and future compatibility work.",
    idealFor: "Users who want a separate target instead of hand-tuning YAML.",
    i18n: {
      zh: {
        title: "Sparkle",
        summary: "保留独立导出目标，方便后续继续做 Sparkle 配置兼容。",
        idealFor: "不想手工改 YAML，希望单独适配 Sparkle 的用户。",
      },
    },
  },
];
