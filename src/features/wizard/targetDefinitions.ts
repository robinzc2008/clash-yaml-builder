import type { AppLanguage, TargetPlatform } from "../../core/model/types";

export interface TargetDefinitionLocale {
  title: string;
  summary: string;
  idealFor: string;
  downloadLabel?: string;
  familyLabel: string;
  kernelLabel: string;
  yamlLabel: string;
  subscriptionLabel: string;
  processLabel: string;
  caution?: string;
}

export interface TargetDefinition {
  id: TargetPlatform;
  section: "recommended";
  title: string;
  summary: string;
  idealFor: string;
  icon: string;
  downloadUrl: string;
  downloadLabel: string;
  familyLabel: string;
  kernelLabel: string;
  yamlLabel: string;
  subscriptionLabel: string;
  processLabel: string;
  caution?: string;
  i18n?: Partial<Record<AppLanguage, TargetDefinitionLocale>>;
}

export interface TargetSectionDefinition {
  id: "recommended";
  title: string;
  description: string;
  targetIds: TargetPlatform[];
  i18n?: Partial<Record<AppLanguage, { title: string; description: string }>>;
}

export const mvpVisibleTargetIds: TargetPlatform[] = ["sparkle", "windows-mihomo"];

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

const sparkleIcon = `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="48" height="48" rx="12" fill="#1a1a2e"/>
<path d="M24 8l3.5 12.5L40 24l-12.5 3.5L24 40l-3.5-12.5L8 24l12.5-3.5L24 8Z" fill="#38bdf8"/>
<path d="M24 8l3.5 12.5L40 24l-12.5 3.5L24 40l-3.5-12.5L8 24l12.5-3.5L24 8Z" fill="url(#sparkle_grad)"/>
<path d="M36 10l1.5 4.5L42 16l-4.5 1.5L36 22l-1.5-4.5L30 16l4.5-1.5L36 10Z" fill="#7dd3fc" opacity=".7"/>
<path d="M13 32l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Z" fill="#7dd3fc" opacity=".5"/>
<circle cx="24" cy="24" r="3.5" fill="#fff" opacity=".3"/>
<defs><linearGradient id="sparkle_grad" x1="8" y1="8" x2="40" y2="40"><stop stop-color="#38bdf8"/><stop offset="1" stop-color="#818cf8"/></linearGradient></defs>
</svg>`;

export const targetSections: TargetSectionDefinition[] = [
  {
    id: "recommended",
    title: "Desktop Clients",
    description: "Choose the client you want to generate and update from this app.",
    targetIds: ["sparkle", "windows-mihomo"],
    i18n: {
      zh: {
        title: "桌面客户端",
        description: "选择你要生成并更新配置的客户端。",
      },
    },
  },
];

export const targetDefinitions: TargetDefinition[] = [
  {
    id: "sparkle",
    section: "recommended",
    title: "Sparkle",
    summary:
      "Generate Sparkle-ready YAML, or publish a local subscription address so Sparkle can refresh nodes later.",
    idealFor: "Sparkle users who want visual rule setup and a cleaner subscription workflow.",
    icon: sparkleIcon,
    downloadUrl: "https://github.com/xishang0128/sparkle/releases",
    downloadLabel: "Download Sparkle ->",
    familyLabel: "Desktop client",
    kernelLabel: "Mihomo core",
    yamlLabel: "Mihomo / Meta YAML",
    subscriptionLabel: "Airport raw link, Clash YAML, or local updatable URL",
    processLabel: "No process routing",
    caution:
      "If you want Sparkle to keep updating through the local subscription address, keep this app running in the tray.",
    i18n: {
      zh: {
        title: "Sparkle",
        summary: "既可以生成 Sparkle 可直接导入的 YAML，也可以发布本地订阅地址，方便后续直接更新节点。",
        idealFor: "适合希望用可视化方式整理规则，并继续保留订阅更新能力的 Sparkle 用户。",
        downloadLabel: "下载 Sparkle ->",
        familyLabel: "桌面客户端",
        kernelLabel: "Mihomo 内核",
        yamlLabel: "Mihomo / Meta YAML",
        subscriptionLabel: "机场原始链接、Clash YAML 或本地可更新订阅地址",
        processLabel: "不支持按进程分流",
        caution: "如果你希望 Sparkle 继续通过本地订阅地址更新节点，请让本应用保持托盘运行。",
      },
    },
  },
  {
    id: "windows-mihomo",
    section: "recommended",
    title: "Clash (Windows client)",
    summary:
      "Generate a Windows-ready Clash configuration, or publish a local subscription address for later updates inside the client.",
    idealFor:
      "Users who want to keep their own routing format and still click update later in the Windows client.",
    icon: mihomoIcon,
    downloadUrl: "https://github.com/Fndroid/clash_for_windows_pkg/releases",
    downloadLabel: "Download Windows Clash ->",
    familyLabel: "Windows client",
    kernelLabel: "Mihomo core",
    yamlLabel: "Mihomo / Meta YAML",
    subscriptionLabel: "Airport raw link, Clash YAML, or local updatable URL",
    processLabel: "Supports Windows process rules",
    caution:
      "Closing the window only hides this app to the tray. If you fully exit it, later node updates in the Windows client can fail.",
    i18n: {
      zh: {
        title: "Clash（Windows客户端）",
        summary: "既可以生成 Windows 版 Clash 可直接导入的 YAML，也可以发布本地订阅地址，方便后续在客户端里直接更新。",
        idealFor: "适合希望保留自己分流格式，同时继续在 Windows 客户端里点“更新订阅”的用户。",
        downloadLabel: "下载 Windows 版 Clash ->",
        familyLabel: "Windows 客户端",
        kernelLabel: "Mihomo 内核",
        yamlLabel: "Mihomo / Meta YAML",
        subscriptionLabel: "机场原始链接、Clash YAML 或本地可更新订阅地址",
        processLabel: "支持 Windows 进程分流",
        caution: "关闭窗口只会缩到托盘；如果把本应用彻底退出，Windows 客户端里后续的节点更新可能失效。",
      },
    },
  },
];
