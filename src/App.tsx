import { useEffect, useMemo, useRef, useState } from "react";
import { createProjectFromWizard } from "./application/createProjectFromWizard";
import { explainProject } from "./application/explainProject";
import { buildProjectArtifact } from "./application/projectPipeline";
import logoMark from "./assets/logo-mark.svg";
import { platformCapabilities } from "./core/capabilities/platformCapabilities";
import { builderProjectSchema } from "./core/model/schema";
import { normalizeProject } from "./core/normalization/normalizeProject";
import { presetPacks } from "./core/presets/presetPacks";
import { regionPresets } from "./core/presets/regionPresets";
import { renderTargetConfig } from "./core/renderers";
import {
  META_RULES_DAT_REPO,
  fetchMetaRulesDatRemoteCatalog,
  type MetaRulesDatRemoteItem,
} from "./core/sources/metaRulesDat";
import { defaultWizardState } from "./features/wizard/defaultWizardState";
import { detectCfwCore, type DetectCfwCoreResult } from "./features/wizard/cfwCoreDetector";
import { publishLocalSubscriptionService } from "./features/wizard/cfwSubscriptionService";
import { downloadTextFile } from "./features/wizard/export";
import {
  clearWizardDraft,
  loadWizardDraft,
  saveWizardDraft,
} from "./features/wizard/persistence";
import { listRunningProcesses } from "./features/wizard/processPicker";
import { resolveSubscriptionsInDesktop } from "./features/wizard/subscriptionResolver";
import {
  createCustomGroupId,
  createCustomGroupName,
  getAllGroupTargetIds,
  getGroupNameByTarget,
  getPolicyTargetOptions,
  policyRefToTargetId,
  suggestTargetForPreset,
  suggestTargetForRemoteRule,
} from "./features/wizard/routingTargets";
import {
  mvpVisibleTargetIds,
  targetDefinitions,
  targetSections,
} from "./features/wizard/targetDefinitions";
import type { TargetPlatform } from "./core/model/types";
import type {
  WizardDomainRule,
  WizardPolicyTargetId,
  WizardProcessRule,
  WizardRegionGroup,
  WizardState,
  WizardSubscription,
} from "./features/wizard/types";
import { messages } from "./i18n/messages";

type RemovablePresetGroupId =
  | "group-ai-services"
  | "group-streaming"
  | "group-apple";

function formatSyncTime(value: string, language: "en" | "zh") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-US", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function createRemotePlaceholder(id: string): MetaRulesDatRemoteItem {
  const [kind = "geosite", name = id] = id.split(":");
  const normalizedKind = kind === "geoip" ? "geoip" : "geosite";
  return {
    id: `${normalizedKind}:${name}`,
    kind: normalizedKind,
    name,
    providerName: `${normalizedKind}:${name}`,
    behavior: normalizedKind === "geoip" ? "ipcidr" : "domain",
    url: "",
    sourceLabel: `MetaCubeX ${normalizedKind}:${name}`,
    sourceUrl: "",
    searchText: `${normalizedKind} ${name}`.toLowerCase(),
  };
}

function createProcessRuleDraft(index: number): WizardProcessRule {
  return {
    id: `process-rule-${Date.now().toString(36)}-${index}`,
    processName: "",
    target: "group-default-proxy",
  };
}

function createDomainRuleDraft(index: number): WizardDomainRule {
  return {
    id: `domain-rule-${Date.now().toString(36)}-${index}`,
    domain: "",
    target: "group-default-proxy",
  };
}

function getRemoteDisplayName(item: MetaRulesDatRemoteItem, alias?: string) {
  return alias?.trim() || item.providerName;
}

function moveItem<T extends { id: string }>(items: T[], sourceId: string, targetId: string) {
  const sourceIndex = items.findIndex((item) => item.id === sourceId);
  const targetIndex = items.findIndex((item) => item.id === targetId);

  if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) {
    return items;
  }

  const next = [...items];
  const [moved] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, moved);
  return next;
}

function shiftItem<T>(items: T[], index: number, delta: -1 | 1) {
  const nextIndex = index + delta;
  if (nextIndex < 0 || nextIndex >= items.length) {
    return items;
  }

  const next = [...items];
  const [moved] = next.splice(index, 1);
  next.splice(nextIndex, 0, moved);
  return next;
}

function extractRemoteRuleInfo(provider: { name: string; url?: string; sourceUrl?: string }) {
  if (provider.sourceUrl !== META_RULES_DAT_REPO && !provider.url?.includes("MetaCubeX/meta-rules-dat")) {
    return null;
  }

  const match = provider.url?.match(/\/geo\/(geosite|geoip)\/([^/.]+)\.ya?ml$/i);
  if (!match) {
    return null;
  }

  const kind = match[1] as "geosite" | "geoip";
  const name = match[2];
  const id = `${kind}:${name}`;
  const alias = provider.name !== id ? provider.name : "";
  return { id, alias };
}

function getValidationMessage(
  issue: { id: string; message: string },
  language: "en" | "zh",
) {
  return issue.message;
}

async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

function normalizePolicyTargetForWizard(
  target: WizardPolicyTargetId,
  state: WizardState,
): WizardPolicyTargetId {
  if (
    (target === "group-ai-services" ||
      target === "group-streaming" ||
      target === "group-apple") &&
    state.removedPresetGroupIds.includes(target)
  ) {
    return "group-default-proxy";
  }

  return target;
}

function getClientLabel(target: TargetPlatform, language: "en" | "zh") {
  if (target === "windows-mihomo") {
    return language === "zh" ? "Clash（Windows客户端）" : "Clash (Windows client)";
  }

  return "Sparkle";
}

function getUpdatableSubscriptionActionLabel(
  target: TargetPlatform,
  language: "en" | "zh",
) {
  const client = getClientLabel(target, language);
  return language === "zh"
    ? `复制 ${client} 可更新订阅地址`
    : `Copy ${client} updatable subscription URL`;
}

function formatCoreDetectionSummary(
  result: DetectCfwCoreResult,
  language: "en" | "zh",
) {
  if (result.status === "not_running") {
    return language === "zh"
      ? "当前没有检测到 Windows 版 Clash 正在运行。先打开客户端，再点一次检测会更准确。"
      : "The Windows Clash client does not appear to be running right now. Open it first, then run detection again.";
  }

  if (result.kernel === "mihomo") {
    return language === "zh"
      ? "检测到当前 Windows 版 Clash 正在使用 Mihomo 内核。"
      : "The Windows Clash client is currently using the Mihomo core.";
  }

  if (result.kernel === "classic") {
    return language === "zh"
      ? "检测到当前 Windows 版 Clash 正在使用 classic 内核。"
      : "The Windows Clash client is currently using the classic core.";
  }

  return language === "zh"
    ? "客户端正在运行，但当前没有识别出明确的内核类型。"
    : "The client is running, but the current core could not be identified.";
}

export function App() {
  const initialDraft = loadWizardDraft();
  const [wizard, setWizard] = useState(() => {
    const restored = initialDraft?.wizard ?? defaultWizardState;
    return mvpVisibleTargetIds.includes(restored.target)
      ? restored
      : { ...restored, target: "sparkle" as const };
  });
  const [importMessage, setImportMessage] = useState("");
  const [currentStep, setCurrentStep] = useState(initialDraft?.step ?? 0);
  const [remoteQuery, setRemoteQuery] = useState("");
  const [remoteCatalog, setRemoteCatalog] = useState<MetaRulesDatRemoteItem[]>([]);
  const [remoteStatus, setRemoteStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const [remoteError, setRemoteError] = useState("");
  const [lastSyncedAt, setLastSyncedAt] = useState("");
  const [runningProcesses, setRunningProcesses] = useState<string[]>([]);
  const [processStatus, setProcessStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const [processError, setProcessError] = useState("");
  const [cfwDetectStatus, setCfwDetectStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const [cfwDetectResult, setCfwDetectResult] = useState<DetectCfwCoreResult | null>(null);
  const [cfwDetectError, setCfwDetectError] = useState("");
  const [draggedDomainRuleId, setDraggedDomainRuleId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = messages[wizard.language];
  const ux =
    wizard.language === "zh"
      ? {
          processRulesMatrixHelp: "左侧填写或选择进程名，右侧选择这个进程要走的目标策略。",
          domainRulesMatrixHelp: "每个域名单独指定目标策略，列表顺序越靠前，规则越优先命中。",
          addProcessRule: "新增进程规则",
          addDomainRule: "新增域名规则",
          removeRule: "删除",
          processColumn: "进程名",
          domainColumn: "域名",
          targetColumn: "目标策略",
          chooseRunningProcess: "选择运行中的进程",
          dragHint: "支持拖动排序，也可以用上下移动按钮调整生效顺序。",
          moveUp: "上移",
          moveDown: "下移",
          remoteAlias: "规则名称",
          remoteAliasHelp: "这里可以直接改导出时使用的规则集名称。",
          renamePlaceholder: "例如 geosite:telegram 或 自定义规则名",
          removeGroup: "删除策略组",
          customGroupAlwaysVisible:
            "这里会显示所有内置策略组和你新增的自定义策略组，不再只显示已引用的项目。",
          processRowHint: "可直接输入 .exe，也可以从运行中的进程里选择。",
          domainDragHandle: "拖动排序",
        }
      : {
          processRulesMatrixHelp:
            "Pick or type a process on the left, then choose the policy target on the right.",
          domainRulesMatrixHelp:
            "Each domain gets its own target. Higher rows are emitted earlier and match first.",
          addProcessRule: "Add process rule",
          addDomainRule: "Add domain rule",
          removeRule: "Remove",
          processColumn: "Process",
          domainColumn: "Domain",
          targetColumn: "Target",
          chooseRunningProcess: "Choose a running process",
          dragHint: "Drag rows to reorder them, or use move up/down controls.",
          moveUp: "Move up",
          moveDown: "Move down",
          remoteAlias: "Rule name",
          remoteAliasHelp: "Rename the exported ruleset directly from this page.",
          renamePlaceholder: "For example geosite:telegram or a custom name",
          removeGroup: "Remove group",
          customGroupAlwaysVisible:
            "All built-in groups and every custom group you add stay visible here, even before they are referenced.",
          processRowHint: "You can type an .exe name or choose from the current running processes.",
          domainDragHandle: "Drag to reorder",
        };

  const isSimple = wizard.mode === "simple";
  const wizardSteps = isSimple
    ? [
        { id: 0, title: t.stepTarget },
        { id: 1, title: t.stepBasics },
        { id: 2, title: t.stepSubscriptions },
        { id: 3, title: t.stepRegions },
        { id: 4, title: t.stepPresets },
        { id: 6, title: t.stepReview },
      ] as const
    : [
        { id: 0, title: t.stepTarget },
        { id: 1, title: t.stepBasics },
        { id: 2, title: t.stepSubscriptions },
        { id: 3, title: t.stepRegions },
        { id: 4, title: t.stepPresets },
        { id: 5, title: t.stepInputs },
        { id: 6, title: t.stepReview },
      ] as const;

  const presetCategoryLabels = {
    foundation: t.foundation,
    ai: t.ai,
    work: t.work,
    streaming: t.streaming,
    communication: t.communication,
    ecosystem: t.ecosystem,
    security: t.security,
  } as const;

  const sourceProject = useMemo(() => createProjectFromWizard(wizard), [wizard]);
  const { project, validation, rendered } = buildProjectArtifact(sourceProject);
  const explanation = explainProject(project, wizard.language);
  const capability = platformCapabilities[project.meta.target];
  const availablePresets = presetPacks.filter((preset) =>
    preset.supportedTargets.includes(wizard.target),
  );
  const groupedPresets = Object.entries(
    availablePresets.reduce<Record<string, typeof availablePresets>>((groups, preset) => {
      groups[preset.category] ??= [];
      groups[preset.category].push(preset);
      return groups;
    }, {}),
  );
  const selectedPresets = availablePresets.filter((preset) =>
    wizard.selectedPresetIds.includes(preset.id),
  );
  const remoteCatalogMap = useMemo(
    () => new Map<string, MetaRulesDatRemoteItem>(remoteCatalog.map((item) => [item.id, item])),
    [remoteCatalog],
  );
  const selectedRemoteItems = wizard.selectedRemoteRuleIds.map(
    (id) => remoteCatalogMap.get(id) ?? createRemotePlaceholder(id),
  );
  const filteredRemoteCatalog = remoteCatalog.filter((item) =>
    item.searchText.includes(remoteQuery.trim().toLowerCase()),
  );
  const selectedSources = [
    ...selectedPresets.flatMap((preset) =>
      preset.ruleProviders.map((provider) => ({
        key: `preset-${preset.id}-${provider.id}`,
        providerName: provider.name,
        preset: preset.i18n?.[wizard.language]?.name ?? preset.name,
        sourceLabel: provider.sourceLabel ?? preset.sourceLabel ?? "Inline rules",
        sourceUrl: provider.url ?? provider.sourceUrl ?? preset.sourceUrl ?? "",
        isRemote: false,
        remoteId: "",
      })),
    ),
    ...selectedRemoteItems.map((item) => ({
      key: `remote-${item.id}`,
      providerName: getRemoteDisplayName(item, wizard.remoteRuleAliases[item.id]),
      preset: item.kind === "geosite" ? t.remoteKindGeosite : t.remoteKindGeoip,
      sourceLabel: item.sourceLabel,
      sourceUrl: item.url,
      isRemote: true,
      remoteId: item.id,
    })),
  ];
  const bundlePresets = selectedPresets.filter((preset) => preset.style !== "service");
  const servicePresets = selectedPresets.filter((preset) => preset.style === "service");
  const policyTargetOptions = getPolicyTargetOptions(wizard, wizard.language);
  const editableGroupTargetIds = getAllGroupTargetIds(wizard);
  const removedPresetGroupIds = wizard.removedPresetGroupIds;
  const removablePresetGroupIds: RemovablePresetGroupId[] = [
    "group-ai-services",
    "group-streaming",
    "group-apple",
  ];
  const hiddenPresetGroupIds = removablePresetGroupIds.filter((targetId) =>
    removedPresetGroupIds.includes(targetId),
  );
  const selectedRoutingItems = [
    ...selectedPresets.map((preset) => ({
      key: `preset:${preset.id}`,
      title: preset.i18n?.[wizard.language]?.name ?? preset.name,
      description: preset.i18n?.[wizard.language]?.description ?? preset.description,
      sourceLabel: preset.sourceLabel ?? "",
    })),
    ...selectedRemoteItems.map((item) => ({
      key: `remote:${item.id}`,
      title: getRemoteDisplayName(item, wizard.remoteRuleAliases[item.id]),
      description:
        item.kind === "geoip"
          ? `${t.remoteKindGeoip} ${item.name}`
          : `${t.remoteKindGeosite} ${item.name}`,
      sourceLabel: item.sourceLabel,
    })),
  ];
  const showProcessSection = platformCapabilities[wizard.target].supports.processRule;
  const blockingValidationIssues = validation.issues.filter((issue) => issue.severity === "error");
  const hasBlockingValidationErrors = blockingValidationIssues.length > 0;
  const isCfwTarget = wizard.target === "windows-mihomo";
  const supportsUpdatableSubscription = wizard.target === "windows-mihomo" || wizard.target === "sparkle";
  const hasSubscriptionUrls = wizard.subscriptions.some((sub) => sub.url.trim());
  const clientLabel = getClientLabel(wizard.target, wizard.language);
  const hasDesktopRuntime =
    typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__?.invoke);
  const visibleTargetDefinitions = targetDefinitions.filter((target) =>
    mvpVisibleTargetIds.includes(target.id),
  );
  const selectedTargetDefinition =
    visibleTargetDefinitions.find((target) => target.id === wizard.target) ??
    visibleTargetDefinitions[0] ??
    targetDefinitions[0];
  const targetSectionEntries = targetSections
    .map((section) => ({
      section,
      targets: section.targetIds
        .filter((targetId) => mvpVisibleTargetIds.includes(targetId))
        .map((targetId) => targetDefinitions.find((target) => target.id === targetId))
        .filter((target): target is NonNullable<typeof target> => target !== undefined),
    }))
    .filter((entry) => entry.targets.length > 0);

  useEffect(() => {
    saveWizardDraft(wizard, currentStep);
  }, [wizard, currentStep]);

  useEffect(() => {
    if (currentStep !== 4 || remoteStatus !== "idle") {
      return;
    }

    void syncRemoteRules();
  }, [currentStep, remoteStatus]);

  useEffect(() => {
    if (currentStep !== 5 || !showProcessSection || processStatus !== "idle") {
      return;
    }

    void refreshRunningProcesses();
  }, [currentStep, processStatus, showProcessSection]);

  async function syncRemoteRules() {
    setRemoteStatus("loading");
    setRemoteError("");

    try {
      const items = await fetchMetaRulesDatRemoteCatalog();
      setRemoteCatalog(items);
      setRemoteStatus("ready");
      setLastSyncedAt(new Date().toISOString());
    } catch (error) {
      setRemoteCatalog([]);
      setRemoteStatus("error");
      setRemoteError(error instanceof Error ? error.message : t.remoteRulesFailed);
    }
  }

  function updateTarget(target: TargetPlatform) {
    setWizard((current) => ({
      ...current,
      target,
      selectedPresetIds: current.selectedPresetIds.filter((presetId) =>
        presetPacks
          .filter((preset) => preset.supportedTargets.includes(target))
          .some((preset) => preset.id === presetId),
      ),
    }));

    setProcessStatus("idle");
    setRunningProcesses([]);
    setProcessError("");
  }

  const stepIds = wizardSteps.map((s) => s.id);

  function goToStep(stepId: number) {
    if (stepIds.includes(stepId as typeof stepIds[number])) {
      setCurrentStep(stepId);
    }
  }

  function goToPrevStep() {
    const idx = stepIds.indexOf(currentStep as typeof stepIds[number]);
    if (idx > 0) setCurrentStep(stepIds[idx - 1]);
  }

  function goToNextStep() {
    const idx = stepIds.indexOf(currentStep as typeof stepIds[number]);
    if (idx < stepIds.length - 1) setCurrentStep(stepIds[idx + 1]);
  }

  function togglePreset(presetId: string) {
    const preset = presetPacks.find((item) => item.id === presetId);
    setWizard((current) => {
      const exists = current.selectedPresetIds.includes(presetId);
      const selectedPresetIds = exists
        ? current.selectedPresetIds.filter((id) => id !== presetId)
        : [...current.selectedPresetIds, presetId];
      const nextAssignments = { ...current.ruleAssignments };

      if (exists) {
        delete nextAssignments[`preset:${presetId}`];
      } else if (preset) {
        nextAssignments[`preset:${presetId}`] = normalizePolicyTargetForWizard(
          suggestTargetForPreset(preset),
          current,
        );
      }

      return {
        ...current,
        selectedPresetIds,
        ruleAssignments: nextAssignments,
      };
    });
  }

  function toggleRemoteRule(item: MetaRulesDatRemoteItem) {
    setWizard((current) => {
      const exists = current.selectedRemoteRuleIds.includes(item.id);
      const selectedRemoteRuleIds = exists
        ? current.selectedRemoteRuleIds.filter((id) => id !== item.id)
        : [...current.selectedRemoteRuleIds, item.id];
      const nextAssignments = { ...current.ruleAssignments };
      const nextAliases = { ...current.remoteRuleAliases };

      if (exists) {
        delete nextAssignments[`remote:${item.id}`];
        delete nextAliases[item.id];
      } else {
        nextAssignments[`remote:${item.id}`] = normalizePolicyTargetForWizard(
          suggestTargetForRemoteRule(item),
          current,
        );
      }

      return {
        ...current,
        selectedRemoteRuleIds,
        ruleAssignments: nextAssignments,
        remoteRuleAliases: nextAliases,
      };
    });
  }

  function updateRemoteAlias(id: string, value: string) {
    setWizard((current) => ({
      ...current,
      remoteRuleAliases: {
        ...current.remoteRuleAliases,
        [id]: value,
      },
    }));
  }

  function addCustomGroup() {
    setWizard((current) => {
      const id = createCustomGroupId(current.customGroups);
      return {
        ...current,
        customGroups: [
          ...current.customGroups,
          {
            id,
            name: createCustomGroupName(current.customGroups.length + 1, current.language),
          },
        ],
      };
    });
  }

  function updateCustomGroupName(groupId: string, value: string) {
    setWizard((current) => ({
      ...current,
      customGroups: current.customGroups.map((group) =>
        group.id === groupId ? { ...group, name: value } : group,
      ),
    }));
  }

  function removePresetGroup(targetId: RemovablePresetGroupId) {
    setWizard((current) => {
      const fallbackTarget: WizardPolicyTargetId = "group-default-proxy";
      const nextRemovedPresetGroupIds = current.removedPresetGroupIds.includes(targetId)
        ? current.removedPresetGroupIds
        : [...current.removedPresetGroupIds, targetId];
      const nextServiceGroupRegions = { ...current.serviceGroupRegions };
      delete nextServiceGroupRegions[targetId];

      return {
        ...current,
        removedPresetGroupIds: nextRemovedPresetGroupIds,
        serviceGroupRegions: nextServiceGroupRegions,
        ruleAssignments: Object.fromEntries(
          Object.entries(current.ruleAssignments).map(([key, value]) => [
            key,
            value === targetId ? fallbackTarget : value,
          ]),
        ) as Record<string, WizardPolicyTargetId>,
        processRules: current.processRules.map((rule) =>
          rule.target === targetId ? { ...rule, target: fallbackTarget } : rule,
        ),
        customDomainRules: current.customDomainRules.map((rule) =>
          rule.target === targetId ? { ...rule, target: fallbackTarget } : rule,
        ),
      };
    });
  }

  function restorePresetGroup(targetId: RemovablePresetGroupId) {
    setWizard((current) => {
      const nextRemovedPresetGroupIds = current.removedPresetGroupIds.filter((id) => id !== targetId);
      const allRegionIds = current.regionGroups.map((region) => region.id);

      return {
        ...current,
        removedPresetGroupIds: nextRemovedPresetGroupIds,
        serviceGroupRegions: {
          ...current.serviceGroupRegions,
          [targetId]: current.serviceGroupRegions[targetId] ?? allRegionIds,
        },
      };
    });
  }

  function removeCustomGroup(groupId: string) {
    const targetId = `group-custom:${groupId}` as WizardPolicyTargetId;
    setWizard((current) => ({
      ...current,
      customGroups: current.customGroups.filter((group) => group.id !== groupId),
      ruleAssignments: Object.fromEntries(
        Object.entries(current.ruleAssignments).map(([key, value]) => [
          key,
          value === targetId ? "group-default-proxy" : value,
        ]),
      ) as Record<string, WizardPolicyTargetId>,
      processRules: current.processRules.map((rule) =>
        rule.target === targetId ? { ...rule, target: "group-default-proxy" } : rule,
      ),
      customDomainRules: current.customDomainRules.map((rule) =>
        rule.target === targetId ? { ...rule, target: "group-default-proxy" } : rule,
      ),
    }));
  }

  /* ---- 订阅管理 ---- */

  function addSubscription() {
    setWizard((current) => ({
      ...current,
      subscriptions: [
        ...current.subscriptions,
        {
          id: `sub-${Date.now().toString(36)}`,
          name: `airport${current.subscriptions.length + 1}`,
          url: "",
        } satisfies WizardSubscription,
      ],
    }));
  }

  function updateSubscription(subId: string, patch: Partial<WizardSubscription>) {
    setWizard((current) => ({
      ...current,
      subscriptions: current.subscriptions.map((sub) =>
        sub.id === subId ? { ...sub, ...patch } : sub,
      ),
    }));
  }

  function removeSubscription(subId: string) {
    setWizard((current) => ({
      ...current,
      subscriptions: current.subscriptions.length > 1
        ? current.subscriptions.filter((sub) => sub.id !== subId)
        : current.subscriptions,
    }));
  }

  /* ---- 地区节点组 ---- */

  function toggleRegionPreset(presetId: string) {
    const preset = regionPresets.find((p) => p.id === presetId);
    if (!preset) return;
    setWizard((current) => {
      const exists = current.regionGroups.some((r) => r.id === presetId);
      if (exists) {
        return {
          ...current,
          regionGroups: current.regionGroups.filter((r) => r.id !== presetId),
          serviceGroupRegions: Object.fromEntries(
            Object.entries(current.serviceGroupRegions).map(([k, v]) => [
              k,
              v.filter((id) => id !== presetId),
            ]),
          ),
        };
      }
      return {
        ...current,
        regionGroups: [
          ...current.regionGroups,
          {
            id: preset.id,
            name: current.language === "zh" ? preset.nameZh : preset.name,
            filter: preset.filter,
            type: preset.type as "select" | "url-test",
            tolerance: preset.tolerance,
            interval: preset.interval,
          },
        ],
      };
    });
  }

  function addCustomRegion() {
    setWizard((current) => ({
      ...current,
      regionGroups: [
        ...current.regionGroups,
        {
          id: `region-custom-${Date.now().toString(36)}`,
          name: current.language === "zh" ? `自定义地区 ${current.regionGroups.length + 1}` : `Custom ${current.regionGroups.length + 1}`,
          filter: "",
          type: "url-test" as const,
          tolerance: 20,
          interval: 60,
        } satisfies WizardRegionGroup,
      ],
    }));
  }

  function updateRegionGroup(regionId: string, patch: Partial<WizardRegionGroup>) {
    setWizard((current) => ({
      ...current,
      regionGroups: current.regionGroups.map((r) =>
        r.id === regionId ? { ...r, ...patch } : r,
      ),
    }));
  }

  function removeRegionGroup(regionId: string) {
    setWizard((current) => ({
      ...current,
      regionGroups: current.regionGroups.filter((r) => r.id !== regionId),
      serviceGroupRegions: Object.fromEntries(
        Object.entries(current.serviceGroupRegions).map(([k, v]) => [
          k,
          v.filter((id) => id !== regionId),
        ]),
      ),
    }));
  }

  function toggleServiceGroupRegion(groupTargetId: string, regionId: string) {
    setWizard((current) => {
      const currentRegions = current.serviceGroupRegions[groupTargetId] ?? [];
      const exists = currentRegions.includes(regionId);
      return {
        ...current,
        serviceGroupRegions: {
          ...current.serviceGroupRegions,
          [groupTargetId]: exists
            ? currentRegions.filter((id) => id !== regionId)
            : [...currentRegions, regionId],
        },
      };
    });
  }

  async function refreshRunningProcesses() {
    setProcessStatus("loading");
    setProcessError("");

    try {
      const processes = await listRunningProcesses();
      setRunningProcesses(processes);
      setProcessStatus("ready");
    } catch (error) {
      setRunningProcesses([]);
      setProcessStatus("error");
      setProcessError(error instanceof Error ? error.message : t.processLoadFailed);
    }
  }

  async function runCfwCoreDetection() {
    setCfwDetectStatus("loading");
    setCfwDetectError("");

    try {
      const result = await detectCfwCore();
      setCfwDetectResult(result);
      setCfwDetectStatus("ready");

      if (result.kernel === "mihomo") {
        updateTarget("windows-mihomo");
      }
    } catch (error) {
      setCfwDetectResult(null);
      setCfwDetectStatus("error");
      setCfwDetectError(
        error instanceof Error
          ? error.message
          : wizard.language === "zh"
            ? "暂时没法检测 Clash（Windows客户端）内核。"
            : "Failed to detect the Clash (Windows client) core.",
      );
    }
  }

  function updateRuleAssignment(key: string, value: WizardPolicyTargetId) {
    setWizard((current) => ({
      ...current,
      ruleAssignments: {
        ...current.ruleAssignments,
        [key]: value,
      },
    }));
  }

  function addProcessRule() {
    setWizard((current) => ({
      ...current,
      processRules: [...current.processRules, createProcessRuleDraft(current.processRules.length + 1)],
    }));
  }

  function updateProcessRule(ruleId: string, patch: Partial<WizardProcessRule>) {
    setWizard((current) => ({
      ...current,
      processRules: current.processRules.map((rule) =>
        rule.id === ruleId ? { ...rule, ...patch } : rule,
      ),
    }));
  }

  function removeProcessRule(ruleId: string) {
    setWizard((current) => ({
      ...current,
      processRules:
        current.processRules.length > 1
          ? current.processRules.filter((rule) => rule.id !== ruleId)
          : [createProcessRuleDraft(1)],
    }));
  }

  function addDomainRule() {
    setWizard((current) => ({
      ...current,
      customDomainRules: [
        ...current.customDomainRules,
        createDomainRuleDraft(current.customDomainRules.length + 1),
      ],
    }));
  }

  function updateDomainRule(ruleId: string, patch: Partial<WizardDomainRule>) {
    setWizard((current) => ({
      ...current,
      customDomainRules: current.customDomainRules.map((rule) =>
        rule.id === ruleId ? { ...rule, ...patch } : rule,
      ),
    }));
  }

  function removeDomainRule(ruleId: string) {
    setWizard((current) => ({
      ...current,
      customDomainRules: current.customDomainRules.filter((rule) => rule.id !== ruleId),
    }));
  }

  function moveDomainRule(ruleId: string, delta: -1 | 1) {
    setWizard((current) => {
      const index = current.customDomainRules.findIndex((rule) => rule.id === ruleId);
      if (index === -1) {
        return current;
      }

      return {
        ...current,
        customDomainRules: shiftItem(current.customDomainRules, index, delta),
      };
    });
  }

  function exportProjectJson() {
    downloadTextFile(
      `${project.meta.name || "routing-project"}.project.json`,
      JSON.stringify(project, null, 2),
      "application/json",
    );
  }

  async function exportYaml() {
    if (hasBlockingValidationErrors) {
      setImportMessage(
        wizard.language === "zh"
          ? "当前仍有阻断错误，已停止导出 YAML。请先处理验证面板里的 ERROR 项。"
          : "YAML export was blocked because the project still has validation errors. Please fix the ERROR items first.",
      );
      return;
    }

    try {
      let exportContent = rendered.content;

      if (
        isCfwTarget &&
        wizard.subscriptions.some((sub) => sub.url.trim())
      ) {
        const resolved = await resolveSubscriptionsInDesktop(
          wizard.subscriptions.map((sub) => ({
            name: sub.name.trim() || "subscription",
            url: sub.url.trim(),
          })),
        );

        const resolvedProject = normalizeProject({
          ...project,
          proxies: resolved.proxies,
          proxyProviders: [],
        });

        exportContent = renderTargetConfig(resolvedProject).content;

        setImportMessage(
          wizard.language === "zh"
            ? "已按 Clash（Windows客户端）自包含 YAML 方式导出，节点已经直接写进文件。注意：如果机场订阅后续更新，需要回到应用重新生成一次 YAML。"
            : "Exported as a self-contained Clash (Windows client) YAML with the subscription nodes embedded directly. If the airport subscription changes later, come back and generate the YAML again.",
        );
      } else {
        setImportMessage("");
      }

      await downloadTextFile(
        `${project.meta.name || "routing-project"}.yaml`,
        exportContent,
        "text/yaml",
      );
    } catch (error) {
      setImportMessage(
        error instanceof Error
          ? (wizard.language === "zh"
              ? `YAML 导出失败：${error.message}`
              : `YAML export failed: ${error.message}`)
          : (wizard.language === "zh"
              ? "YAML 导出失败。"
              : "YAML export failed."),
      );
    }
  }

  async function publishUpdatableSubscriptionUrl() {
    if (hasBlockingValidationErrors) {
      setImportMessage(
        wizard.language === "zh"
          ? `当前仍有阻断错误，已停止发布 ${clientLabel} 订阅地址。请先处理验证面板里的 ERROR 项。`
          : `Publishing the ${clientLabel} subscription URL was blocked because the project still has validation errors. Please fix the ERROR items first.`,
      );
      return;
    }

    if (!hasDesktopRuntime) {
      setImportMessage(
        wizard.language === "zh"
          ? `当前是 Web 预览模式。发布 ${clientLabel} 可更新订阅地址需要桌面版运行时。`
          : `You are currently in the web preview. Publishing a ${clientLabel} updatable subscription URL requires the desktop runtime.`,
      );
      return;
    }

    try {
      const localProviderBase = `http://127.0.0.1:16780/providers/${wizard.target}`;
      const publishedProject = {
        ...project,
        meta: {
          ...project.meta,
          updatedAt: new Date().toISOString(),
        },
        proxyProviders: project.proxyProviders.map((provider) => ({
          ...provider,
          url: `${localProviderBase}/${encodeURIComponent(provider.id)}.yaml`,
        })),
      };

      const publishedConfig = renderTargetConfig(publishedProject).content;
      const subscriptionUrl = await publishLocalSubscriptionService(
        wizard.target,
        JSON.stringify(project),
        publishedConfig,
      );

      await copyTextToClipboard(subscriptionUrl);
      setImportMessage(
        wizard.language === "zh"
          ? `已复制 ${clientLabel} 可更新订阅地址：${subscriptionUrl}。把这个地址导入客户端后，后续点“更新订阅”就会重新拉取机场节点，并按你当前项目里的规则格式生成最新配置。关闭窗口会自动缩到托盘；如果把本应用彻底退出，后续节点更新可能失效。`
          : `Copied the ${clientLabel} updatable subscription URL: ${subscriptionUrl}. Import this URL into the client, then future "Update subscription" actions will fetch the latest airport nodes and rebuild the config with your current routing format. Closing the window keeps the app in the tray; fully exiting the app can break later node updates.`,
      );
    } catch (error) {
      setImportMessage(
        error instanceof Error
          ? (wizard.language === "zh"
              ? `发布 ${clientLabel} 订阅地址失败：${error.message}`
              : `Publishing the ${clientLabel} subscription URL failed: ${error.message}`)
          : (wizard.language === "zh"
              ? `发布 ${clientLabel} 订阅地址失败。`
              : `Publishing the ${clientLabel} subscription URL failed.`),
      );
    }
  }

  function resetWizard() {
    setWizard(defaultWizardState);
    setCurrentStep(0);
    setRemoteQuery("");
    setImportMessage(t.draftCleared);
    setProcessStatus("idle");
    setRunningProcesses([]);
    setProcessError("");
    setCfwDetectStatus("idle");
    setCfwDetectResult(null);
    setCfwDetectError("");
    clearWizardDraft();
  }

  async function handleImportProject(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const parsed = builderProjectSchema.parse(JSON.parse(text));

      const customGroups = parsed.groups
        .filter(
          (group) =>
            ![
              "group-default-proxy",
              "group-ai-services",
              "group-streaming",
              "group-apple",
            ].includes(group.id),
        )
        .map((group, index) => ({
          id: group.id.startsWith("group-custom:")
            ? group.id.replace("group-custom:", "")
            : `imported-${index + 1}`,
          name: group.name,
        }));

      const importedStateForPolicies = {
        ...defaultWizardState,
        defaultProxyGroupName:
          parsed.groups.find((group) => group.id === "group-default-proxy")?.name ??
          defaultWizardState.defaultProxyGroupName,
        aiGroupName:
          parsed.groups.find((group) => group.id === "group-ai-services")?.name ??
          defaultWizardState.aiGroupName,
        streamingGroupName:
          parsed.groups.find((group) => group.id === "group-streaming")?.name ??
          defaultWizardState.streamingGroupName,
        appleGroupName:
          parsed.groups.find((group) => group.id === "group-apple")?.name ??
          defaultWizardState.appleGroupName,
        removedPresetGroupIds: ([
          "group-ai-services",
          "group-streaming",
          "group-apple",
        ] as const).filter(
          (targetId) => !parsed.groups.some((group) => group.id === targetId),
        ),
        customGroups,
      };

      const selectedPresetIds = presetPacks
        .filter((preset) =>
          preset.ruleProviders.some((provider) =>
            parsed.ruleProviders.some((item) => item.name === provider.name),
          ),
        )
        .map((preset) => preset.id);

      const remoteProviderEntries = parsed.ruleProviders
        .map((provider) => ({ provider, remote: extractRemoteRuleInfo(provider) }))
        .filter(
          (entry): entry is {
            provider: (typeof parsed.ruleProviders)[number];
            remote: { id: string; alias: string };
          } => Boolean(entry.remote),
        );

      const selectedRemoteRuleIds = remoteProviderEntries.map((entry) => entry.remote.id);
      const remoteRuleAliases = Object.fromEntries(
        remoteProviderEntries
          .filter((entry) => entry.remote.alias)
          .map((entry) => [entry.remote.id, entry.remote.alias]),
      ) as Record<string, string>;

      const nextAssignments: Record<string, WizardPolicyTargetId> = {};

      selectedPresetIds.forEach((presetId) => {
        const preset = presetPacks.find((item) => item.id === presetId);
        const firstProviderName = preset?.ruleProviders[0]?.name;
        const matchedRule = parsed.rules.find((rule) => rule.match.value === firstProviderName);
        nextAssignments[`preset:${presetId}`] = matchedRule
          ? policyRefToTargetId(matchedRule.policy, importedStateForPolicies)
          : "group-default-proxy";
      });

      remoteProviderEntries.forEach((entry) => {
        const matchedRule = parsed.rules.find((rule) => rule.match.value === entry.provider.name);
        nextAssignments[`remote:${entry.remote.id}`] = matchedRule
          ? policyRefToTargetId(matchedRule.policy, importedStateForPolicies)
          : "group-default-proxy";
      });

      const processRules = parsed.rules
        .filter((rule) => rule.match.kind === "process_name")
        .sort((left, right) => left.priority - right.priority)
        .map((rule, index) => ({
          id: `process-rule-imported-${index + 1}`,
          processName: rule.match.value ?? "",
          target: policyRefToTargetId(rule.policy, importedStateForPolicies),
        }));

      const customDomainRules = parsed.rules
        .filter((rule) => rule.id.startsWith("rule-custom-domain-"))
        .sort((left, right) => left.priority - right.priority)
        .map((rule, index) => ({
          id: `domain-rule-imported-${index + 1}`,
          domain: rule.match.value ?? "",
          target: policyRefToTargetId(rule.policy, importedStateForPolicies),
        }));

      setWizard({
        language: wizard.language,
        projectName: parsed.meta.name,
        target: parsed.meta.target,
        mode: parsed.meta.mode,
        selectedPresetIds,
        selectedRemoteRuleIds,
        remoteRuleAliases,
        ruleAssignments: nextAssignments,
        defaultProxyGroupName: importedStateForPolicies.defaultProxyGroupName,
        aiGroupName: importedStateForPolicies.aiGroupName,
        streamingGroupName: importedStateForPolicies.streamingGroupName,
        appleGroupName: importedStateForPolicies.appleGroupName,
        removedPresetGroupIds: importedStateForPolicies.removedPresetGroupIds,
        customGroups,
        finalPolicyMode:
          parsed.settings.finalPolicy.kind === "builtin" &&
          parsed.settings.finalPolicy.value === "DIRECT"
            ? "direct"
            : "default-proxy",
        enableLanDirect: parsed.settings.enableLanDirect,
        lanCidr:
          parsed.rules.find((rule) => rule.match.kind === "src_ip_cidr")?.match.value ??
          defaultWizardState.lanCidr,
        processRules: processRules.length > 0 ? processRules : [createProcessRuleDraft(1)],
        customDomainRules,
        subscriptions: parsed.proxyProviders.map((provider, index) => ({
          id: `sub-imported-${index + 1}`,
          name: provider.name,
          url: provider.url ?? "",
        })),
        regionGroups: parsed.groups
          .filter((group) => group.includeAll)
          .map((group) => ({
            id: group.id,
            name: group.name,
            filter: group.filter ?? "",
            type: (group.type === "url-test" ? "url-test" : "select") as "select" | "url-test",
            tolerance: group.tolerance ?? 0,
            interval: group.testInterval ?? 0,
          })),
        serviceGroupRegions: Object.fromEntries(
          parsed.groups
            .filter((group) => !group.includeAll)
            .map((group) => [
              group.id,
              group.members
                .filter((m) => m.kind === "group")
                .map((m) => {
                  const regionGroup = parsed.groups.find(
                    (rg) => rg.includeAll && rg.name === m.ref,
                  );
                  return regionGroup?.id;
                })
                .filter((id): id is string => !!id),
            ]),
        ),
      });

      setImportMessage(`${t.imported} ${file.name}`);
      goToStep(4);
    } catch (error) {
      setImportMessage(
        error instanceof Error ? `${t.importFailed}: ${error.message}` : t.importFailed,
      );
    } finally {
      event.target.value = "";
    }
  }

  const [showGuide, setShowGuide] = useState(false);
  const [regexHelperId, setRegexHelperId] = useState<string | null>(null);
  const [regexInclude, setRegexInclude] = useState("");
  const [regexExclude, setRegexExclude] = useState("");

  function buildRegex(include: string, exclude: string): string {
    const inc = include.split(/[,，]/).map((k) => k.trim()).filter(Boolean);
    const exc = exclude.split(/[,，]/).map((k) => k.trim()).filter(Boolean);
    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    if (inc.length === 0 && exc.length === 0) return "";

    const incPart = inc.length > 0 ? `(?=.*(${inc.map(esc).join("|")}))` : "";
    const excPart = exc.length > 0 ? `(?!.*(${exc.map(esc).join("|")}))` : "";

    if (inc.length > 0 && exc.length === 0) {
      return `(?i)(${inc.map(esc).join("|")})`;
    }
    return `^${incPart}${excPart}`;
  }

  function applyRegexToRegion(regionId: string) {
    const regex = buildRegex(regexInclude, regexExclude);
    if (regex) {
      updateRegionGroup(regionId, { filter: regex });
    }
    setRegexHelperId(null);
    setRegexInclude("");
    setRegexExclude("");
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="hero-topbar">
          <div className="hero-brand">
            <img src={logoMark} alt="" className="hero-logo" />
            <div className="hero-brand-copy">
              <p className="eyebrow">{t.heroEyebrow}</p>
            </div>
          </div>
          <div className="hero-actions">
            <span className="hero-author">{t.author}</span>
            <select
              className="language-select"
              value={wizard.language}
              onChange={(event) =>
                setWizard((current) => ({
                  ...current,
                  language: event.target.value as "en" | "zh",
                }))
              }
            >
              <option value="zh">中文</option>
              <option value="en">EN</option>
            </select>
          </div>
        </div>
        <h1>clash-yaml-builder</h1>
        <p className="lede">{t.heroDescription}</p>
        <button
          type="button"
          className="guide-toggle-button"
          onClick={() => setShowGuide(!showGuide)}
        >
          {showGuide ? t.guideCollapse : t.guideExpand}
        </button>
      </section>

      {showGuide ? (
        <section className="guide-panel">
          <h2>{t.guideTitle}</h2>
          <p className="guide-intro">{t.guideIntro}</p>
          <ol className="guide-steps">
            <li>
              {wizard.language === "zh"
                ? "先选你要生成配置的客户端：Sparkle 或 Clash（Windows客户端）。"
                : "Pick the client you want to generate for first: Sparkle or Clash (Windows client)."}
            </li>
            <li>{t.guideStep2}</li>
            <li>{t.guideStep3}</li>
            <li>{t.guideStep4}</li>
            <li>{t.guideStep5}</li>
          </ol>
          <div className="guide-example">
            <strong>{t.guideExample}</strong>
            <p>{t.guideExampleExplain}</p>
          </div>
          <h3>{t.guideConcepts}</h3>
          <div className="guide-concepts">
            <div className="guide-concept-card">
              <strong>{t.guideConcept1Title}</strong>
              <p>{t.guideConcept1}</p>
            </div>
            <div className="guide-concept-card">
              <strong>{t.guideConcept2Title}</strong>
              <p>{t.guideConcept2}</p>
            </div>
            <div className="guide-concept-card">
              <strong>{t.guideConcept3Title}</strong>
              <p>{t.guideConcept3}</p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="wizard-layout">
        <aside className="panel wizard-sidebar">
          <h2>{t.wizard}</h2>
          <div className="step-list">
            {wizardSteps.map((step) => (
              <button
                key={step.id}
                type="button"
                className={`step-chip ${currentStep === step.id ? "step-chip-active" : ""}`}
                onClick={() => goToStep(step.id)}
              >
                <span>{step.id + 1}</span>
                <strong>{step.title}</strong>
              </button>
            ))}
          </div>
          <div className="summary-box">
            <strong>
              {selectedTargetDefinition.i18n?.[wizard.language]?.title ?? selectedTargetDefinition.title}
            </strong>
            <span>
              {t.project}: {wizard.projectName || t.untitled}
            </span>
            <span>
              {t.presets}: {selectedPresets.length + selectedRemoteItems.length}
            </span>
            <span>
              {t.sources}: {selectedSources.length}
            </span>
            {initialDraft ? <span>{t.draftRestored}</span> : null}
          </div>
        </aside>

        <div className="wizard-main">
          {currentStep === 0 ? (
            <section className="grid grid-wide">
              <article className="panel">
                <h2>{t.step1}</h2>
                <p className="step-help">{t.step1_help}</p>
                <div className="target-chooser-intro">
                  <div className="target-chooser-copy">
                    <span className="target-chooser-kicker">
                      {wizard.language === "zh" ? "选择客户端" : "Choose a client"}
                    </span>
                    <strong>
                      {wizard.language === "zh"
                        ? "同一个项目里支持 Sparkle 和 Clash（Windows客户端）两条配置流程。"
                        : "This project currently supports both Sparkle and Clash (Windows client) workflows."}
                    </strong>
                    <span>
                      {wizard.language === "zh"
                        ? "选好客户端后，后续订阅、地区和规则会自动按对应格式生成。"
                        : "Once you pick a client, subscriptions, regions, and rules are generated in the matching format automatically."}
                    </span>
                  </div>
                </div>

                {mvpVisibleTargetIds.includes("windows-mihomo") ? (
                  <div className="target-detect-strip">
                    <div className="target-detect-copy">
                      <strong>
                        {wizard.language === "zh"
                          ? "不确定你现在用的 Windows 版 Clash 是不是 Mihomo 内核？"
                          : "Not sure whether your Windows Clash client is using the Mihomo core?"}
                      </strong>
                      <span>
                        {wizard.language === "zh"
                          ? "点一下就能按当前运行进程帮你判断。检测到 Mihomo 时，也会自动切到 Clash（Windows客户端）档案。"
                          : "One click inspects the current running processes. When Mihomo is detected, the wizard also switches to the Clash (Windows client) profile for you."}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="action-button action-button-ghost target-detect-button"
                      onClick={() => void runCfwCoreDetection()}
                      disabled={cfwDetectStatus === "loading"}
                    >
                      {cfwDetectStatus === "loading"
                        ? (wizard.language === "zh"
                            ? "正在检测内核..."
                            : "Detecting core...")
                        : (wizard.language === "zh"
                            ? "检测 Clash（Windows客户端）内核"
                            : "Detect Clash (Windows client) core")}
                    </button>
                  </div>
                ) : null}

                {cfwDetectStatus === "ready" && cfwDetectResult ? (
                  <div
                    className={`cfw-detect-panel ${
                      cfwDetectResult.kernel === "mihomo"
                        ? "cfw-detect-panel-good"
                        : cfwDetectResult.kernel === "classic" ||
                            cfwDetectResult.status === "unknown"
                          ? "cfw-detect-panel-warn"
                          : "cfw-detect-panel-neutral"
                    }`}
                  >
                    <strong>
                      {wizard.language === "zh"
                        ? "Clash（Windows客户端）内核检测结果"
                        : "Clash (Windows client) core detection"}
                    </strong>
                    <p>{formatCoreDetectionSummary(cfwDetectResult, wizard.language)}</p>
                    {cfwDetectResult.kernel === "mihomo" ? (
                      <span>
                        {wizard.language === "zh"
                          ? "已经自动切到 Clash（Windows客户端）档案，接下来按这个流程继续生成 YAML 就行。"
                          : "The wizard already switched to the Clash (Windows client) profile, so you can continue with that flow."}
                      </span>
                    ) : null}
                    {cfwDetectResult.kernel === "classic" ? (
                      <span>
                        {wizard.language === "zh"
                          ? "当前只适配 Mihomo 内核。请先在 Windows 版 Clash 里切到 Mihomo，再回来继续。"
                          : "This flow currently supports the Mihomo core only. Switch the Windows Clash client to Mihomo first, then come back and continue."}
                      </span>
                    ) : null}
                    {cfwDetectResult.status === "not_running" ? (
                      <span>
                        {wizard.language === "zh"
                          ? "先打开 Windows 版 Clash 再测一次，结果会更准确。"
                          : "Open the Windows Clash client first, then run detection again for a more reliable result."}
                      </span>
                    ) : null}
                  </div>
                ) : null}

                {cfwDetectStatus === "error" ? (
                  <div className="cfw-detect-panel cfw-detect-panel-warn">
                    <strong>
                      {wizard.language === "zh"
                        ? "暂时没法自动检测 Clash（Windows客户端）内核"
                        : "The app could not detect the Clash (Windows client) core right now"}
                    </strong>
                    <p>
                      {cfwDetectError ||
                        (wizard.language === "zh"
                          ? "当前环境里无法读取本地进程。这个按钮需要在桌面版里使用。"
                          : "The current environment could not read local processes. This button works in the desktop app.")}
                    </p>
                  </div>
                ) : null}

                <div className="target-sections">
                  {targetSectionEntries.map(({ section, targets }) => {
                    const localizedSection = section.i18n?.[wizard.language];
                    const sectionTitle = localizedSection?.title ?? section.title;
                    const sectionDescription = localizedSection?.description ?? section.description;

                    return (
                      <section className="target-section" key={section.id}>
                        <div className="target-section-header">
                          <span className="target-section-kicker">
                            {section.id === "recommended"
                              ? wizard.language === "zh"
                                ? "推荐"
                                : "Recommended"
                              : wizard.language === "zh"
                                ? "更多选项"
                                : "More options"}
                          </span>
                          <h3>{sectionTitle}</h3>
                          <p>{sectionDescription}</p>
                        </div>

                        <div className="target-grid">
                          {targets.map((target) => {
                            const localized = target.i18n?.[wizard.language];
                            const isActive = wizard.target === target.id;

                            return (
                              <button
                                className={`target-card ${isActive ? "target-card-active" : ""}`}
                                key={target.id}
                                onClick={() => updateTarget(target.id)}
                                type="button"
                              >
                                <div className="target-card-head">
                                  <span className="target-card-icon" dangerouslySetInnerHTML={{ __html: target.icon }} />
                                  <div className="target-card-copy">
                                    <div className="target-card-title-row">
                                      <strong>{localized?.title ?? target.title}</strong>
                                      {isActive ? (
                                        <span className="target-card-current">
                                          {wizard.language === "zh" ? "当前选择" : "Current"}
                                        </span>
                                      ) : null}
                                    </div>
                                    <span>{localized?.summary ?? target.summary}</span>
                                  </div>
                                </div>

                                <div className="target-badge-row">
                                  <span className="target-badge">{localized?.familyLabel ?? target.familyLabel}</span>
                                  <span className="target-badge target-badge-strong">
                                    {localized?.kernelLabel ?? target.kernelLabel}
                                  </span>
                                </div>

                                <div className="target-details">
                                  <div className="target-detail">
                                    <span>{wizard.language === "zh" ? "YAML 方言" : "YAML dialect"}</span>
                                    <strong>{localized?.yamlLabel ?? target.yamlLabel}</strong>
                                  </div>
                                  <div className="target-detail">
                                    <span>{wizard.language === "zh" ? "订阅格式" : "Subscription"}</span>
                                    <strong>{localized?.subscriptionLabel ?? target.subscriptionLabel}</strong>
                                  </div>
                                  <div className="target-detail">
                                    <span>{wizard.language === "zh" ? "进程分流" : "Process rules"}</span>
                                    <strong>{localized?.processLabel ?? target.processLabel}</strong>
                                  </div>
                                </div>

                                {(localized?.caution ?? target.caution) ? (
                                  <p className="target-warning">{localized?.caution ?? target.caution}</p>
                                ) : null}

                                <small>{localized?.idealFor ?? target.idealFor}</small>
                                <a
                                  className="target-download-link"
                                  href={target.downloadUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {localized?.downloadLabel ?? target.downloadLabel}
                                </a>
                              </button>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })}
                </div>

                <div className="target-selected-panel">
                  <div className="target-selected-heading">
                    <span className="target-section-kicker">
                      {wizard.language === "zh" ? "当前档案摘要" : "Current profile summary"}
                    </span>
                    <h3>
                      {selectedTargetDefinition.i18n?.[wizard.language]?.title ?? selectedTargetDefinition.title}
                    </h3>
                    <p>
                      {selectedTargetDefinition.i18n?.[wizard.language]?.summary ?? selectedTargetDefinition.summary}
                    </p>
                  </div>
                  <div className="target-selected-meta">
                    <div className="target-selected-item">
                      <span>{wizard.language === "zh" ? "客户端" : "Client"}</span>
                      <strong>
                        {selectedTargetDefinition.i18n?.[wizard.language]?.familyLabel ??
                          selectedTargetDefinition.familyLabel}
                      </strong>
                    </div>
                    <div className="target-selected-item">
                      <span>{wizard.language === "zh" ? "内核" : "Core"}</span>
                      <strong>
                        {selectedTargetDefinition.i18n?.[wizard.language]?.kernelLabel ??
                          selectedTargetDefinition.kernelLabel}
                      </strong>
                    </div>
                    <div className="target-selected-item">
                      <span>{wizard.language === "zh" ? "订阅要求" : "Subscription requirement"}</span>
                      <strong>
                        {selectedTargetDefinition.i18n?.[wizard.language]?.subscriptionLabel ??
                          selectedTargetDefinition.subscriptionLabel}
                      </strong>
                    </div>
                    <div className="target-selected-item">
                      <span>{wizard.language === "zh" ? "适用场景" : "Best for"}</span>
                      <strong>
                        {selectedTargetDefinition.i18n?.[wizard.language]?.idealFor ??
                          selectedTargetDefinition.idealFor}
                      </strong>
                    </div>
                  </div>
                </div>
              </article>
            </section>
          ) : null}

          {currentStep === 1 ? (
            <section className="grid">
              <article className="panel">
                <h2>{t.step2}</h2>
                <p className="step-help">{t.step2_help}</p>
                <label className="field">
                  <span>{t.projectName}</span>
                  <input
                    value={wizard.projectName}
                    onChange={(event) =>
                      setWizard((current) => ({
                        ...current,
                        projectName: event.target.value,
                      }))
                    }
                  />
                </label>
                <div className="mode-selector">
                  <span className="mode-label">{t.mode}</span>
                  <div className="mode-buttons">
                    <button
                      type="button"
                      className={`mode-btn ${wizard.mode === "simple" ? "mode-btn-active" : ""}`}
                      onClick={() => setWizard((c) => ({ ...c, mode: "simple" }))}
                    >
                      <strong>{t.simple}</strong>
                      <small>{t.simpleHelp}</small>
                    </button>
                    <button
                      type="button"
                      className={`mode-btn ${wizard.mode === "advanced" ? "mode-btn-active" : ""}`}
                      onClick={() => setWizard((c) => ({ ...c, mode: "advanced" }))}
                    >
                      <strong>{t.advanced}</strong>
                      <small>{t.advancedHelp}</small>
                    </button>
                  </div>
                  <p className="mode-hint">{t.modeHelp}</p>
                </div>
                <label className="field">
                  <span>{t.defaultProxyGroupName}</span>
                  <input
                    value={wizard.defaultProxyGroupName}
                    onChange={(event) =>
                      setWizard((current) => ({
                        ...current,
                        defaultProxyGroupName: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="field">
                  <span>{t.finalFallbackPolicy}</span>
                  <select
                    value={wizard.finalPolicyMode}
                    onChange={(event) =>
                      setWizard((current) => ({
                        ...current,
                        finalPolicyMode: event.target.value as "default-proxy" | "direct",
                      }))
                    }
                  >
                    <option value="default-proxy">{t.useDefaultProxyGroup}</option>
                    <option value="direct">{t.direct}</option>
                  </select>
                </label>
              </article>

              <article className="panel">
                <h2>{t.tip}</h2>
                <div className="hint stack">
                  <span>{t.presetTip}</span>
                  <span>
                    {capability.supports.processRule
                      ? t.processRulesSupported
                      : t.processRulesUnsupported}
                  </span>
                  <span>
                    {capability.supports.srcIpRule ? t.srcIpRulesSupported : t.srcIpRulesUnsupported}
                  </span>
                </div>
              </article>
            </section>
          ) : null}

          {currentStep === 2 ? (
            <section className="grid grid-wide">
              <article className="panel">
                <h2>{t.step1_5}</h2>
                <p className="step-help">{t.step1_5_help}</p>
                {supportsUpdatableSubscription && hasSubscriptionUrls ? (
                  <p
                    className={`helper-text subscription-status ${
                      hasDesktopRuntime ? "subscription-status-good" : "subscription-status-warn"
                    }`}
                  >
                    {hasDesktopRuntime
                      ? wizard.language === "zh"
                        ? `桌面版会在本地自动解析当前订阅。你既可以导出一份本地 YAML 备用，也可以发布 ${clientLabel} 可更新订阅地址。`
                        : `The desktop app resolves the current subscriptions locally. You can export a local YAML as a backup, or publish an updatable ${clientLabel} subscription URL.`
                      : wizard.language === "zh"
                        ? `${clientLabel} 的本地解析、可更新订阅地址和后台桥接都需要桌面版。`
                        : `${clientLabel} local resolution, the updatable subscription URL, and the background bridge all require the desktop app.`}
                  </p>
                ) : null}
                <div className="stack">
                  {wizard.subscriptions.map((sub, index) => (
                    <div className="matrix-row matrix-row-two-col" key={sub.id}>
                      <div className="matrix-main-grid">
                        <label className="field compact-field">
                          <span>{t.subscriptionName}</span>
                          <input
                            value={sub.name}
                            onChange={(e) => updateSubscription(sub.id, { name: e.target.value })}
                            placeholder={`airport${index + 1}`}
                          />
                        </label>
                        <label className="field compact-field">
                          <span>{t.subscriptionUrl}</span>
                          <input
                            value={sub.url}
                            onChange={(e) => updateSubscription(sub.id, { url: e.target.value })}
                            placeholder={t.subscriptionUrlPlaceholder}
                          />
                        </label>
                      </div>
                      <div className="matrix-actions-row">
                        <button
                          className="action-button action-button-ghost"
                          type="button"
                          onClick={() => removeSubscription(sub.id)}
                          disabled={wizard.subscriptions.length <= 1}
                        >
                          {t.removeSubscription}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  className="action-button action-button-ghost"
                  type="button"
                  onClick={addSubscription}
                >
                  {t.addSubscription}
                </button>
                {wizard.subscriptions.every((sub) => !sub.url.trim()) ? (
                  <p className="helper-text">{t.noSubscriptions}</p>
                ) : null}
              </article>
            </section>
          ) : null}

          {currentStep === 3 ? (
            <section className="grid grid-wide">
              <article className="panel">
                <h2>{t.step1_7}</h2>
                <p className="step-help">{t.step1_7_help}</p>

                <div className="section-block">
                  <h3>{wizard.language === "zh" ? "已添加的地区节点组" : "Your Region Groups"}</h3>
                  <div className="stack">
                    {wizard.regionGroups.map((region) => (
                      <div className="region-card" key={region.id}>
                        <div className="region-card-grid">
                          <label className="field compact-field">
                            <span>{t.regionName}</span>
                            <input
                              value={region.name}
                              onChange={(e) => updateRegionGroup(region.id, { name: e.target.value })}
                            />
                          </label>
                          <label className="field compact-field">
                            <span>{t.regionFilter}</span>
                            <input
                              value={region.filter}
                              onChange={(e) => updateRegionGroup(region.id, { filter: e.target.value })}
                              placeholder="(?i)(香港|HK|Hong Kong)"
                            />
                          </label>
                          <label className="field compact-field">
                            <span>{wizard.language === "zh" ? "选节点方式" : "Selection mode"}</span>
                            <select
                              value={region.type}
                              onChange={(e) => updateRegionGroup(region.id, { type: e.target.value as "select" | "url-test" })}
                            >
                              <option value="select">{wizard.language === "zh" ? "🖐 手动选" : "🖐 Manual"}</option>
                              <option value="url-test">{wizard.language === "zh" ? "⚡ 自动选最快" : "⚡ Auto fastest"}</option>
                            </select>
                          </label>
                        </div>
                        <div className="region-card-footer">
                          <button
                            type="button"
                            className="regex-helper-toggle"
                            onClick={() => {
                              if (regexHelperId === region.id) {
                                setRegexHelperId(null);
                                setRegexInclude("");
                                setRegexExclude("");
                              } else {
                                setRegexHelperId(region.id);
                                setRegexInclude("");
                                setRegexExclude("");
                              }
                            }}
                          >
                            {regexHelperId === region.id ? t.regexHelperHide : t.regexHelperToggle}
                          </button>
                          <button
                            className="action-button action-button-ghost"
                            type="button"
                            onClick={() => removeRegionGroup(region.id)}
                          >
                            {t.removeRegion}
                          </button>
                        </div>
                        {regexHelperId === region.id ? (
                          <div className="regex-helper">
                            <div className="regex-helper-grid">
                              <label className="field compact-field">
                                <span>{t.regexIncludeLabel}</span>
                                <input
                                  value={regexInclude}
                                  onChange={(e) => setRegexInclude(e.target.value)}
                                  placeholder={t.regexHelperPlaceholder}
                                />
                              </label>
                              <label className="field compact-field">
                                <span>{t.regexExcludeLabel}</span>
                                <input
                                  value={regexExclude}
                                  onChange={(e) => setRegexExclude(e.target.value)}
                                  placeholder={t.regexExcludePlaceholder}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") applyRegexToRegion(region.id);
                                  }}
                                />
                              </label>
                            </div>
                            <p className="regex-helper-hint">{t.regexHelperHint}</p>
                            {(regexInclude.trim() || regexExclude.trim()) ? (
                              <div className="regex-helper-preview">
                                <code className="code-inline">{buildRegex(regexInclude, regexExclude)}</code>
                                <button
                                  type="button"
                                  className="action-button"
                                  onClick={() => applyRegexToRegion(region.id)}
                                >
                                  {t.regexHelperGenerate}
                                </button>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="section-block">
                  <h3>{t.regionBuiltIn}</h3>
                  <p className="step-help" style={{ fontSize: "0.88rem", marginBottom: 8 }}>
                    {wizard.language === "zh"
                      ? "点击下面的按钮可以快速添加对应地区。已添加的会自动变灰。"
                      : "Click a button below to add that region. Already-added ones are grayed out."}
                  </p>
                  <div className="action-row" style={{ flexWrap: "wrap", gap: "6px" }}>
                    {regionPresets.map((preset) => {
                      const existing = wizard.regionGroups.find((r) => r.id === preset.id);
                      const displayName = existing
                        ? existing.name
                        : (wizard.language === "zh" ? preset.nameZh : preset.name);
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          className={`action-button ${existing ? "" : "action-button-ghost"}`}
                          onClick={() => toggleRegionPreset(preset.id)}
                        >
                          {existing ? "✓ " : ""}{displayName}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  className="action-button action-button-ghost"
                  type="button"
                  onClick={addCustomRegion}
                >
                  {t.addCustomRegion}
                </button>
              </article>
            </section>
          ) : null}

          {currentStep === 4 ? (
            <section className="grid">
              <article className="panel">
                <h2>{t.step3}</h2>
                <p className="step-help">{t.step3_help}</p>

                <div className="stack">
                  <h3>{t.quickPresets}</h3>
                  {groupedPresets.map(([category, presets]) => (
                    <div className="preset-group" key={category}>
                      <h3>{presetCategoryLabels[category as keyof typeof presetCategoryLabels] ?? category}</h3>
                      {presets.map((preset) => (
                        <label className="check-row" key={preset.id}>
                          <input
                            checked={wizard.selectedPresetIds.includes(preset.id)}
                            onChange={() => togglePreset(preset.id)}
                            type="checkbox"
                          />
                          <span>
                            <strong>{preset.i18n?.[wizard.language]?.name ?? preset.name}</strong>
                            <small>
                              {preset.i18n?.[wizard.language]?.description ?? preset.description}
                            </small>
                            <small>
                              {preset.style === "service" ? t.typeService : t.typeBundle}
                            </small>
                            <small>
                              {t.source}: {preset.sourceLabel ?? "MetaCubeX meta-rules-dat"}
                            </small>
                          </span>
                        </label>
                      ))}
                    </div>
                  ))}
                </div>

                <div className="catalog-block">
                  <div className="catalog-header catalog-header-wide">
                    <div>
                      <h3>{t.remoteCatalog}</h3>
                      <p className="helper-text">{t.remoteCatalogHelp}</p>
                    </div>
                    <button
                      className="action-button action-button-ghost"
                      type="button"
                      onClick={() => void syncRemoteRules()}
                      disabled={remoteStatus === "loading"}
                    >
                      {remoteStatus === "ready" ? t.refreshRemoteRules : t.syncRemoteRules}
                    </button>
                  </div>

                  {remoteStatus === "loading" ? <p>{t.syncingRemoteRules}</p> : null}
                  {remoteStatus === "ready" && lastSyncedAt ? (
                    <p className="helper-text">
                      {t.lastSyncedAt}: {formatSyncTime(lastSyncedAt, wizard.language)}
                      {" · "}
                      {remoteCatalog.length} {wizard.language === "zh" ? "条规则" : "rules"}
                    </p>
                  ) : null}
                  {remoteStatus === "error" ? (
                    <p className="helper-text">
                      {t.remoteRulesFailed}
                      {remoteError ? ` ${remoteError}` : ""}
                    </p>
                  ) : null}

                  <label className="field">
                    <span>{t.searchRemoteRules}</span>
                    <input
                      value={remoteQuery}
                      onChange={(event) => setRemoteQuery(event.target.value)}
                      placeholder={t.searchRemoteRulesPlaceholder}
                    />
                  </label>

                  {remoteStatus === "ready" && filteredRemoteCatalog.length === 0 ? (
                    <p>{remoteQuery.trim() ? t.noRemoteMatches : t.noRemoteRulesYet}</p>
                  ) : null}

                  {remoteStatus === "ready" ? (
                    <div className="remote-rule-list">
                      {filteredRemoteCatalog.map((item) => (
                        <label className="check-row remote-rule-row" key={item.id}>
                          <input
                            checked={wizard.selectedRemoteRuleIds.includes(item.id)}
                            onChange={() => toggleRemoteRule(item)}
                            type="checkbox"
                          />
                          <span>
                            <strong>{item.providerName}</strong>
                            <small>
                              {item.kind === "geoip" ? t.remoteKindGeoip : t.remoteKindGeosite}
                            </small>
                            <small>{item.url}</small>
                          </span>
                        </label>
                      ))}
                    </div>
                  ) : null}
                </div>
              </article>

              <article className="panel">
                <h2>{t.sourcePreview}</h2>
                <div className="source-summary">
                  <span>
                    {t.bundles}: {bundlePresets.length}
                  </span>
                  <span>
                    {t.services}: {servicePresets.length}
                  </span>
                  <span>
                    {t.remoteRules}: {selectedRemoteItems.length}
                  </span>
                </div>
                {selectedSources.length === 0 ? (
                  <p>{t.noSources}</p>
                ) : (
                  <div className="stack source-stack">
                    {selectedSources.map((source) => (
                      <div className="source-card" key={source.key}>
                        {source.isRemote ? (
                          <label className="field compact-field">
                            <span>{ux.remoteAlias}</span>
                            <input
                              value={wizard.remoteRuleAliases[source.remoteId] ?? source.providerName}
                              onChange={(event) => updateRemoteAlias(source.remoteId, event.target.value)}
                              placeholder={ux.renamePlaceholder}
                            />
                            <small>{ux.remoteAliasHelp}</small>
                          </label>
                        ) : (
                          <strong>{source.providerName}</strong>
                        )}
                        <span>{source.preset}</span>
                        <small>{source.sourceLabel}</small>
                        {source.sourceUrl ? (
                          <a href={source.sourceUrl} target="_blank" rel="noreferrer">
                            {source.sourceUrl}
                          </a>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </article>
            </section>
          ) : null}

          {currentStep === 5 ? (
            <section className="grid">
              <article className="panel">
                <h2>{t.step4}</h2>
                <p className="step-help">{t.step4_help}</p>

                <div className="section-block">
                  <div className="section-heading">
                    <h3>{t.routingGroupSection}</h3>
                    <p>{t.routingGroupSectionHelp}</p>
                  </div>
                  <div className="group-editor-list">
                    {editableGroupTargetIds.map((targetId) => {
                      const isDefaultGroup = targetId === "group-default-proxy";
                      const isCustomGroup = targetId.startsWith("group-custom:");
                      const customId = isCustomGroup ? targetId.replace("group-custom:", "") : "";
                      const customGroup = isCustomGroup
                        ? wizard.customGroups.find((group) => group.id === customId)
                        : null;

                      const label =
                        targetId === "group-default-proxy"
                          ? t.defaultProxyGroupName
                          : targetId === "group-ai-services"
                            ? t.aiGroupName
                            : targetId === "group-streaming"
                              ? t.streamingGroupName
                              : targetId === "group-apple"
                                ? t.appleGroupName
                                : (customGroup?.name ?? targetId);

                      const value =
                        targetId === "group-default-proxy"
                          ? wizard.defaultProxyGroupName
                          : targetId === "group-ai-services"
                            ? wizard.aiGroupName
                            : targetId === "group-streaming"
                              ? wizard.streamingGroupName
                              : targetId === "group-apple"
                                ? wizard.appleGroupName
                                : (customGroup?.name ?? "");

                      return (
                        <div className="group-editor-row" key={targetId}>
                          <label className="field inline-field-grow">
                            <span>{label}</span>
                            <input
                              value={value}
                              onChange={(event) => {
                                const nextValue = event.target.value;

                                if (targetId === "group-default-proxy") {
                                  setWizard((current) => ({
                                    ...current,
                                    defaultProxyGroupName: nextValue,
                                  }));
                                  return;
                                }

                                if (targetId === "group-ai-services") {
                                  setWizard((current) => ({
                                    ...current,
                                    aiGroupName: nextValue,
                                  }));
                                  return;
                                }

                                if (targetId === "group-streaming") {
                                  setWizard((current) => ({
                                    ...current,
                                    streamingGroupName: nextValue,
                                  }));
                                  return;
                                }

                                if (targetId === "group-apple") {
                                  setWizard((current) => ({
                                    ...current,
                                    appleGroupName: nextValue,
                                  }));
                                  return;
                                }

                                updateCustomGroupName(customId, nextValue);
                              }}
                            />
                          </label>
                          {!isDefaultGroup ? (
                            <button
                              type="button"
                              className="action-button action-button-ghost inline-remove-button"
                              onClick={() =>
                                isCustomGroup
                                  ? removeCustomGroup(customId)
                                  : removePresetGroup(targetId as RemovablePresetGroupId)
                              }
                            >
                              {ux.removeGroup}
                            </button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                  {hiddenPresetGroupIds.length > 0 ? (
                    <div className="group-restore-row">
                      <span>{wizard.language === "zh" ? "恢复预设策略组" : "Restore preset groups"}</span>
                      <div className="group-restore-actions">
                        {hiddenPresetGroupIds.map((targetId) => (
                          <button
                            key={targetId}
                            type="button"
                            className="action-button action-button-ghost"
                            onClick={() => restorePresetGroup(targetId)}
                          >
                            {getGroupNameByTarget(targetId, {
                              ...wizard,
                              removedPresetGroupIds: [],
                            })}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <button
                    type="button"
                    className="action-button action-button-ghost"
                    onClick={addCustomGroup}
                  >
                    {t.addCustomGroup}
                  </button>
                </div>

                <div className="section-block">
                  <div className="section-heading">
                    <h3>{t.regionRegionsPerGroup}</h3>
                    <p>{t.regionRegionsPerGroupHelp}</p>
                  </div>
                  <div className="stack">
                    {editableGroupTargetIds.map((targetId) => {
                      const groupName = getGroupNameByTarget(targetId, wizard);
                      const selectedRegionIds = wizard.serviceGroupRegions[targetId] ?? [];
                      return (
                        <div className="region-assignment-block" key={targetId}>
                          <div className="region-assignment-header">
                            <strong>{groupName}</strong>
                            {targetId !== "group-default-proxy" ? (
                              <button
                                type="button"
                                className="action-button action-button-ghost inline-remove-button"
                                onClick={() =>
                                  targetId.startsWith("group-custom:")
                                    ? removeCustomGroup(targetId.replace("group-custom:", ""))
                                    : removePresetGroup(targetId as RemovablePresetGroupId)
                                }
                              >
                                {ux.removeGroup}
                              </button>
                            ) : null}
                          </div>
                          <div className="check-grid">
                            {wizard.regionGroups.map((region) => (
                              <label className="check-row" key={region.id}>
                                <input
                                  type="checkbox"
                                  checked={selectedRegionIds.includes(region.id)}
                                  onChange={() => toggleServiceGroupRegion(targetId, region.id)}
                                />
                                <span>
                                  {region.name}
                                  {region.type === "url-test" ? (
                                    <small style={{ opacity: 0.6 }}>
                                      {wizard.language === "zh" ? "(自动)" : "(auto)"}
                                    </small>
                                  ) : null}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="section-block">
                  <div className="section-heading">
                    <h3>{t.selectedRulesSection}</h3>
                    <p>{t.selectedRulesSectionHelp}</p>
                  </div>
                  <div className="assignment-list">
                    {selectedRoutingItems.map((item) => (
                      <div className="assignment-row" key={item.key}>
                        <div className="assignment-copy">
                          <strong>{item.title}</strong>
                          <small>{item.description}</small>
                          {item.sourceLabel ? <small>{item.sourceLabel}</small> : null}
                        </div>
                        <label className="field assignment-field">
                          <span>{t.targetPolicy}</span>
                          <select
                            value={wizard.ruleAssignments[item.key] ?? "group-default-proxy"}
                            onChange={(event) =>
                              updateRuleAssignment(item.key, event.target.value as WizardPolicyTargetId)
                            }
                          >
                            {policyTargetOptions.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="section-block">
                  <div className="section-heading">
                    <h3>{t.lanSection}</h3>
                    <p>{t.lanSectionHelp}</p>
                  </div>
                  <label className="check-row">
                    <input
                      checked={wizard.enableLanDirect}
                      onChange={(event) =>
                        setWizard((current) => ({
                          ...current,
                          enableLanDirect: event.target.checked,
                        }))
                      }
                      type="checkbox"
                    />
                    <span>
                      <strong>{t.enableLanDirect}</strong>
                      <small>{t.enableLanDirectHelp}</small>
                    </span>
                  </label>
                  <label className="field">
                    <span>{t.lanCidr}</span>
                    <input
                      value={wizard.lanCidr}
                      onChange={(event) =>
                        setWizard((current) => ({ ...current, lanCidr: event.target.value }))
                      }
                    />
                    {(t as Record<string, string>).lanCidrHelp ? (
                      <small className="field-hint">{(t as Record<string, string>).lanCidrHelp}</small>
                    ) : null}
                  </label>
                </div>

                <div className="section-block">
                  <div className="section-heading">
                    <h3>{t.processSection}</h3>
                    <p>{showProcessSection ? ux.processRulesMatrixHelp : t.processRoutingUnavailable}</p>
                  </div>
                  {showProcessSection ? (
                    <>
                      <p className="helper-text">{ux.processRowHint}</p>
                      <div className="matrix-list">
                        {wizard.processRules.map((rule) => (
                          <div className="matrix-row matrix-row-two-col" key={rule.id}>
                            <div className="matrix-main-grid">
                              <label className="field compact-field">
                                <span>{ux.processColumn}</span>
                                <input
                                  value={rule.processName}
                                  onChange={(event) =>
                                    updateProcessRule(rule.id, { processName: event.target.value })
                                  }
                                />
                              </label>
                              <label className="field compact-field">
                                <span>{ux.targetColumn}</span>
                                <select
                                  value={rule.target}
                                  onChange={(event) =>
                                    updateProcessRule(rule.id, {
                                      target: event.target.value as WizardPolicyTargetId,
                                    })
                                  }
                                >
                                  {policyTargetOptions.map((option) => (
                                    <option key={option.id} value={option.id}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            </div>
                            <div className="matrix-actions-row">
                              <select
                                className="process-select"
                                value=""
                                onChange={(event) => {
                                  if (!event.target.value) {
                                    return;
                                  }
                                  updateProcessRule(rule.id, { processName: event.target.value });
                                }}
                                disabled={runningProcesses.length === 0}
                              >
                                <option value="">{ux.chooseRunningProcess}</option>
                                {runningProcesses.map((processName) => (
                                  <option key={`${rule.id}-${processName}`} value={processName}>
                                    {processName}
                                  </option>
                                ))}
                              </select>
                              <button
                                className="action-button action-button-ghost"
                                type="button"
                                onClick={() => removeProcessRule(rule.id)}
                              >
                                {ux.removeRule}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="action-row">
                        <button
                          className="action-button action-button-ghost"
                          type="button"
                          onClick={() => void refreshRunningProcesses()}
                          disabled={processStatus === "loading"}
                        >
                          {runningProcesses.length > 0 ? t.refreshProcesses : t.detectProcesses}
                        </button>
                        <button
                          className="action-button action-button-ghost"
                          type="button"
                          onClick={addProcessRule}
                        >
                          {ux.addProcessRule}
                        </button>
                      </div>
                      {processStatus === "loading" ? <p className="helper-text">{t.loadingProcesses}</p> : null}
                      {processStatus === "ready" && runningProcesses.length === 0 ? (
                        <p className="helper-text">{t.noProcessesFound}</p>
                      ) : null}
                      {processStatus === "error" ? (
                        <p className="helper-text">
                          {t.processLoadFailed}
                          {processError ? ` ${processError}` : ""}
                        </p>
                      ) : null}
                    </>
                  ) : null}
                </div>

                <div className="section-block">
                  <div className="section-heading">
                    <h3>{t.customDomainSection}</h3>
                    <p>{ux.domainRulesMatrixHelp}</p>
                  </div>
                  {wizard.customDomainRules.length > 0 ? (
                    <>
                      <p className="helper-text">{ux.dragHint}</p>
                      <div className="matrix-list">
                        {wizard.customDomainRules.map((rule, index) => (
                          <div
                            className={`matrix-row matrix-row-sortable ${draggedDomainRuleId === rule.id ? "matrix-row-dragging" : ""}`}
                            key={rule.id}
                            draggable
                            onDragStart={() => setDraggedDomainRuleId(rule.id)}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={() => {
                              if (!draggedDomainRuleId) {
                                return;
                              }

                              setWizard((current) => ({
                                ...current,
                                customDomainRules: moveItem(current.customDomainRules, draggedDomainRuleId, rule.id),
                              }));
                              setDraggedDomainRuleId(null);
                            }}
                            onDragEnd={() => setDraggedDomainRuleId(null)}
                          >
                            <div className="drag-handle" title={ux.domainDragHandle}>
                              <span />
                              <span />
                              <span />
                            </div>
                            <div className="matrix-main-grid">
                              <label className="field compact-field">
                                <span>{ux.domainColumn}</span>
                                <input
                                  value={rule.domain}
                                  onChange={(event) => updateDomainRule(rule.id, { domain: event.target.value })}
                                />
                              </label>
                              <label className="field compact-field">
                                <span>{ux.targetColumn}</span>
                                <select
                                  value={rule.target}
                                  onChange={(event) =>
                                    updateDomainRule(rule.id, {
                                      target: event.target.value as WizardPolicyTargetId,
                                    })
                                  }
                                >
                                  {policyTargetOptions.map((option) => (
                                    <option key={option.id} value={option.id}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            </div>
                            <div className="matrix-actions-column">
                              <button
                                className="action-button action-button-ghost"
                                type="button"
                                onClick={() => moveDomainRule(rule.id, -1)}
                                disabled={index === 0}
                              >
                                {ux.moveUp}
                              </button>
                              <button
                                className="action-button action-button-ghost"
                                type="button"
                                onClick={() => moveDomainRule(rule.id, 1)}
                                disabled={index === wizard.customDomainRules.length - 1}
                              >
                                {ux.moveDown}
                              </button>
                              <button
                                className="action-button action-button-ghost"
                                type="button"
                                onClick={() => removeDomainRule(rule.id)}
                              >
                                {ux.removeRule}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="empty-state">
                      {wizard.language === "zh"
                        ? "当前没有自定义域名规则。只有在你需要额外补充特定域名时再新增即可。"
                        : "There are no custom domain rules yet. Add one only when you need an extra manual domain override."}
                    </p>
                  )}
                  <button
                    className="action-button action-button-ghost"
                    type="button"
                    onClick={addDomainRule}
                  >
                    {ux.addDomainRule}
                  </button>
                </div>
              </article>
            </section>
          ) : null}

          {currentStep === 6 ? (
            <>
              <section className="grid">
                <article className="panel">
                  <h2>{t.step5}</h2>
                  <div className="action-row">
                    <button className="action-button" onClick={exportProjectJson} type="button">
                      {t.exportProjectJson}
                    </button>
                    <button
                      className="action-button action-button-secondary"
                      onClick={exportYaml}
                      type="button"
                      disabled={hasBlockingValidationErrors}
                    >
                      {t.exportYaml}
                    </button>
                    {supportsUpdatableSubscription && hasSubscriptionUrls ? (
                      <button
                        className="action-button"
                        onClick={() => void publishUpdatableSubscriptionUrl()}
                        type="button"
                        disabled={hasBlockingValidationErrors}
                      >
                        {getUpdatableSubscriptionActionLabel(wizard.target, wizard.language)}
                      </button>
                    ) : null}
                    <button
                      className="action-button action-button-ghost"
                      onClick={() => fileInputRef.current?.click()}
                      type="button"
                    >
                      {t.importProjectJson}
                    </button>
                    <button
                      className="action-button action-button-ghost"
                      onClick={resetWizard}
                      type="button"
                    >
                      {t.resetDraft}
                    </button>
                    <input
                      ref={fileInputRef}
                      accept=".json"
                      className="hidden-input"
                      onChange={handleImportProject}
                      type="file"
                    />
                  </div>
                {isCfwTarget && hasSubscriptionUrls ? (
                  <p className="helper-text">
                    {wizard.language === "zh"
                      ? "导出 YAML 适合做备用文件。导出时应用会在最后一步本地拉取订阅并把节点直接写进文件，所以这个页面里的 YAML 预览仍是生成前的草稿视图。"
                      : "Exporting YAML is best for a backup file. The app fetches the subscriptions locally at the last step and writes the nodes directly into the file, so the preview on this page is still the draft before resolution."}
                  </p>
                ) : null}
                {supportsUpdatableSubscription && hasSubscriptionUrls ? (
                  <p className="helper-text">
                    {wizard.language === "zh"
                      ? `日常使用更推荐“${getUpdatableSubscriptionActionLabel(wizard.target, "zh")}”。客户端导入这个本地地址后，点“更新订阅”时会重新拉取机场节点，并按你当前项目里的规则格式重新生成。关闭窗口会缩到托盘；如果把本应用彻底退出，后续节点更新可能失效。`
                      : `For daily use, the recommended path is "${getUpdatableSubscriptionActionLabel(wizard.target, "en")}". After the client imports that local URL, each "Update subscription" action fetches the latest airport nodes and rebuilds the config with your current routing format. Closing the window sends the app to the tray; fully exiting the app can break later node updates.`}
                  </p>
                ) : null}
                {importMessage ? <p className="import-message">{importMessage}</p> : null}
              </article>

                <article className="panel">
                  <h2>{t.validation}</h2>
                  {validation.issues.length === 0 ? (
                    <p>{t.noValidationIssues}</p>
                  ) : (
                    <ul>
                      {validation.issues.map((issue) => (
                        <li key={issue.id}>
                          <strong>{issue.severity.toUpperCase()}</strong>: {getValidationMessage(issue, wizard.language)}
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              </section>

              <section className="grid">
                <article className="panel">
                  <h2>{t.generatedExplanation}</h2>
                  <div className="stack">
                    {explanation.map((item, index) => (
                      <p className="explanation-line" key={`${index}-${item}`}>
                        {item}
                      </p>
                    ))}
                  </div>
                </article>

                <article className="panel preview-panel">
                  <div className="preview-heading">
                    <h2>{t.projectJsonPreview}</h2>
                    <span>{t.previewHint}</span>
                  </div>
                  <pre className="code-preview">{JSON.stringify(project, null, 2)}</pre>
                </article>

                <article className="panel preview-panel">
                  <div className="preview-heading">
                    <h2>{t.renderedYamlPreview}</h2>
                    <span>{t.previewHint}</span>
                  </div>
                  <pre className="code-preview">{rendered.content}</pre>
                </article>
              </section>
            </>
          ) : null}

          <section className="panel wizard-controls">
            <button
              type="button"
              className="action-button action-button-ghost"
              onClick={goToPrevStep}
              disabled={currentStep === stepIds[0]}
            >
              {t.previous}
            </button>
            <button
              type="button"
              className="action-button"
              onClick={goToNextStep}
              disabled={currentStep === stepIds[stepIds.length - 1]}
            >
              {t.next}
            </button>
          </section>
        </div>
      </section>
    </main>
  );
}
