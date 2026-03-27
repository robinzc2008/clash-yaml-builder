import type { AppLanguage, TargetPlatform } from "../../core/model/types";

export interface TargetDefinition {
  id: TargetPlatform;
  title: string;
  summary: string;
  idealFor: string;
  icon: string;
  downloadUrl: string;
  downloadLabel: string;
  i18n?: Partial<Record<AppLanguage, { title: string; summary: string; idealFor: string; downloadLabel?: string }>>;
}

/* Clash cat face — the iconic logo used by OpenClash/Clash ecosystem */
const openclashIcon = `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="48" height="48" rx="12" fill="#1a1a2e"/>
<path d="M12 14l5 10h-9l4-10Z" fill="#e8443a"/>
<path d="M36 14l5 10h-9l4-10Z" fill="#e8443a"/>
<ellipse cx="24" cy="30" rx="14" ry="11" fill="#e8443a"/>
<ellipse cx="18.5" cy="28" rx="2.8" ry="3.5" fill="#1a1a2e"/>
<ellipse cx="29.5" cy="28" rx="2.8" ry="3.5" fill="#1a1a2e"/>
<circle cx="19.5" cy="27" r="1.2" fill="#fff" opacity=".9"/>
<circle cx="30.5" cy="27" r="1.2" fill="#fff" opacity=".9"/>
<ellipse cx="24" cy="33" rx="1.5" ry="1" fill="#1a1a2e"/>
<path d="M22.5 34q1.5 1.5 3 0" stroke="#1a1a2e" stroke-width=".8" fill="none" stroke-linecap="round"/>
</svg>`;

/* MetaCubeX geometric cube — Mihomo/Meta brand identity */
const mihomoIcon = `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="48" height="48" rx="12" fill="#1a1a2e"/>
<path d="M24 10L38 18v12L24 38 10 30V18l14-8Z" fill="#7c4dff" opacity=".2"/>
<path d="M24 10L38 18v12L24 38 10 30V18l14-8Z" stroke="#7c4dff" stroke-width="1.5"/>
<path d="M24 10v28M10 18l14 6 14-6" stroke="#7c4dff" stroke-width="1.2" opacity=".5"/>
<path d="M24 24L10 18" stroke="#a78bfa" stroke-width="1.2"/>
<path d="M24 24L38 18" stroke="#a78bfa" stroke-width="1.2"/>
<path d="M24 24v14" stroke="#a78bfa" stroke-width="1.2"/>
<circle cx="24" cy="24" r="3" fill="#a78bfa"/>
<circle cx="24" cy="10" r="2" fill="#7c4dff"/>
<circle cx="38" cy="18" r="2" fill="#7c4dff"/>
<circle cx="10" cy="18" r="2" fill="#7c4dff"/>
<circle cx="24" cy="38" r="2" fill="#7c4dff"/>
<circle cx="38" cy="30" r="2" fill="#7c4dff"/>
<circle cx="10" cy="30" r="2" fill="#7c4dff"/>
</svg>`;

/* Sparkle — four-pointed star with diamond motif */
const sparkleIcon = `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="48" height="48" rx="12" fill="#1a1a2e"/>
<path d="M24 8l3.5 12.5L40 24l-12.5 3.5L24 40l-3.5-12.5L8 24l12.5-3.5L24 8Z" fill="#38bdf8"/>
<path d="M24 8l3.5 12.5L40 24l-12.5 3.5L24 40l-3.5-12.5L8 24l12.5-3.5L24 8Z" fill="url(#sparkle_grad)"/>
<path d="M36 10l1.5 4.5L42 16l-4.5 1.5L36 22l-1.5-4.5L30 16l4.5-1.5L36 10Z" fill="#7dd3fc" opacity=".7"/>
<path d="M13 32l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Z" fill="#7dd3fc" opacity=".5"/>
<circle cx="24" cy="24" r="3.5" fill="#fff" opacity=".3"/>
<defs><linearGradient id="sparkle_grad" x1="8" y1="8" x2="40" y2="40"><stop stop-color="#38bdf8"/><stop offset="1" stop-color="#818cf8"/></linearGradient></defs>
</svg>`;

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
    title: "Sparkle (Windows / macOS / Linux)",
    summary: "Modern Mihomo GUI client with cross-platform support.",
    idealFor: "Sparkle users on any desktop platform who want ready-to-use configs.",
    icon: sparkleIcon,
    downloadUrl: "https://github.com/xishang0128/sparkle/releases",
    downloadLabel: "Sparkle GitHub →",
    i18n: {
      zh: {
        title: "Sparkle（全平台桌面客户端）",
        summary: "现代化 Mihomo 图形客户端，支持 Windows、macOS 和 Linux。",
        idealFor: "使用 Sparkle 的桌面用户，不需要手动改 YAML。",
        downloadLabel: "Sparkle 下载 →",
      },
    },
  },
];
