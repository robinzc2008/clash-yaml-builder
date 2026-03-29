/**
 * 本地生成 Sparkle 可用的测试用 YAML（与当前 createProjectFromWizard + renderSparkle 一致）。
 *
 * 用法（PowerShell）：
 *   $env:SUB_URL="https://你的订阅链接"; npx --yes tsx scripts/generate-sparkle-sample.ts
 *
 * 未设置 SUB_URL 时使用占位链接，生成后请手动替换 proxy-providers 下的 url。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createProjectFromWizard } from "../src/application/createProjectFromWizard";
import { renderSparkle } from "../src/core/renderers/sparkle";
import { buildDefaultRegionGroups } from "../src/core/presets/regionPresets";
import type { WizardState } from "../src/features/wizard/types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outFile = path.join(root, "sparkle-test-家庭分流方案.yaml");

const subUrl =
  process.env.SUB_URL?.trim() ||
  "https://example.com/请在此处替换为你的机场订阅链接";

const allRegions = buildDefaultRegionGroups("zh");
const regionGroups = allRegions.filter((r) =>
  ["region-manual", "region-hk", "region-jp"].includes(r.id),
);
const regionIds = regionGroups.map((r) => r.id);

const state: WizardState = {
  language: "zh",
  projectName: "家庭分流方案",
  target: "sparkle",
  mode: "advanced",
  selectedPresetIds: [
    "preset-cn-direct",
    "preset-ai-routing",
    "preset-github",
    "preset-google",
  ],
  selectedRemoteRuleIds: [],
  remoteRuleAliases: {},
  ruleAssignments: {
    "preset:preset-cn-direct": "builtin:DIRECT",
    "preset:preset-ai-routing": "group-ai-services",
    "preset:preset-github": "group-default-proxy",
    "preset:preset-google": "group-default-proxy",
  },
  defaultProxyGroupName: "🚀 默认代理",
  aiGroupName: "🤖 AI",
  streamingGroupName: "📹 流媒体",
  appleGroupName: "🍎 Apple",
  removedPresetGroupIds: [],
  customGroups: [],
  finalPolicyMode: "default-proxy",
  enableLanDirect: true,
  lanCidr: "192.168.1.0/24",
  processRules: [],
  customDomainRules: [],
  subscriptions: [{ id: "sub-1", name: "Sakuracat", url: subUrl }],
  regionGroups,
  serviceGroupRegions: {
    "group-default-proxy": regionIds,
    "group-ai-services": regionIds,
    "group-streaming": regionIds,
    "group-apple": regionIds,
  },
};

const project = createProjectFromWizard(state);
const { content } = renderSparkle(project);

const banner =
  `# 由 clash-yaml-builder 脚本生成（Sparkle / 标准 Mihomo YAML 字段）\n` +
  `# 生成时间: ${new Date().toISOString()}\n` +
  (process.env.SUB_URL?.trim()
    ? "# 已使用环境变量 SUB_URL 作为订阅地址。\n"
    : "# 未设置 SUB_URL：请搜索 example.com 并替换为你的真实订阅 URL。\n") +
  `\n`;

fs.writeFileSync(outFile, banner + content, "utf8");
console.log("已写入:", outFile);
