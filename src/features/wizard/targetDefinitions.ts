import type { AppLanguage, TargetPlatform } from "../../core/model/types";

export interface TargetDefinition {
  id: TargetPlatform;
  title: string;
  summary: string;
  idealFor: string;
  /** SVG icon markup (inline) */
  icon: string;
  /** Official download URL */
  downloadUrl: string;
  downloadLabel: string;
  i18n?: Partial<Record<AppLanguage, { title: string; summary: string; idealFor: string; downloadLabel?: string }>>;
}

const openclashIcon = `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="10" fill="#1a73e8" fill-opacity=".12"/><path d="M20 8a12 12 0 1 0 0 24 12 12 0 0 0 0-24Zm0 2a10 10 0 0 1 7.07 2.93l-4.24 4.24A5 5 0 0 0 20 16v-6Zm-1 6a5 5 0 0 0-2.83 1.17l-4.24-4.24A10 10 0 0 1 19 10v6Zm-4.07 2.93A5 5 0 0 0 15 20h-5a10 10 0 0 1 2.93-7.07l2 2ZM15 21a5 5 0 0 0 1.17 2.83l-4.24 4.24A10 10 0 0 1 10 21h5Zm2.93 4.07A5 5 0 0 0 20 26v4a10 10 0 0 1-7.07-2.93l4.24-4.24.76.24ZM21 26a5 5 0 0 0 2.83-1.17l4.24 4.24A10 10 0 0 1 21 30v-4Zm4.07-2.93A5 5 0 0 0 26 21h4a10 10 0 0 1-2.93 7.07l-2-2ZM26 20a5 5 0 0 0-1.17-2.83l4.24-4.24A10 10 0 0 1 30 20h-4Z" fill="#1a73e8"/></svg>`;

const mihomoIcon = `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="10" fill="#7c3aed" fill-opacity=".12"/><path d="M12 14h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z" stroke="#7c3aed" stroke-width="1.5"/><circle cx="16" cy="20" r="2" fill="#7c3aed"/><circle cx="24" cy="20" r="2" fill="#7c3aed"/><path d="M18 20h4" stroke="#7c3aed" stroke-width="1.5"/><path d="M14 26v2M26 26v2" stroke="#7c3aed" stroke-width="1.5" stroke-linecap="round"/></svg>`;

const sparkleIcon = `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="10" fill="#f59e0b" fill-opacity=".12"/><path d="M20 8l2.5 7.5L30 18l-7.5 2.5L20 28l-2.5-7.5L10 18l7.5-2.5L20 8Z" fill="#f59e0b"/><path d="M28 10l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Z" fill="#f59e0b" opacity=".6"/><path d="M12 26l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2Z" fill="#f59e0b" opacity=".6"/></svg>`;

export const targetDefinitions: TargetDefinition[] = [
  {
    id: "openclash",
    title: "OpenClash Router",
    summary: "Best for routing by service, domain, device IP, and home network scenarios.",
    idealFor: "Home routers, NAS setups, and family-wide traffic policies.",
    icon: openclashIcon,
    downloadUrl: "https://github.com/vernesong/OpenClash/releases",
    downloadLabel: "OpenClash GitHub →",
    i18n: {
      zh: {
        title: "OpenClash 路由器",
        summary: "适合按服务、域名、设备 IP 和家庭网络场景来做分流。",
        idealFor: "家庭路由器、NAS 场景，以及全家设备统一策略。",
        downloadLabel: "OpenClash 下载 →",
      },
    },
  },
  {
    id: "windows-mihomo",
    title: "Windows Clash / Mihomo",
    summary: "Adds client-side flexibility, including process-aware routing.",
    idealFor: "Desktop users who want app-aware and service-aware routing.",
    icon: mihomoIcon,
    downloadUrl: "https://github.com/MetaCubeX/mihomo/releases",
    downloadLabel: "Mihomo GitHub →",
    i18n: {
      zh: {
        title: "Windows Clash / Mihomo",
        summary: "客户端侧更灵活，也更适合做按进程和按服务同时分流。",
        idealFor: "需要按应用和按服务同步分流的桌面用户。",
        downloadLabel: "Mihomo 下载 →",
      },
    },
  },
  {
    id: "sparkle",
    title: "Sparkle (Windows / macOS)",
    summary: "Export configs for the Sparkle proxy client. Works on both Windows and macOS.",
    idealFor: "Sparkle users on any desktop platform who want ready-to-use configs.",
    icon: sparkleIcon,
    downloadUrl: "https://github.com/nicegram/nicegram-sparkle",
    downloadLabel: "Sparkle GitHub →",
    i18n: {
      zh: {
        title: "Sparkle（Windows / macOS 通用）",
        summary: "导出适配 Sparkle 客户端的配置文件，Windows 和 macOS 都能用。",
        idealFor: "使用 Sparkle 的桌面用户，不需要手动改 YAML。",
        downloadLabel: "Sparkle 下载 →",
      },
    },
  },
];
