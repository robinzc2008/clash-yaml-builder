import { useEffect, useMemo, useRef, useState } from "react";
import { createProjectFromWizard } from "./application/createProjectFromWizard";
import { explainProject } from "./application/explainProject";
import { buildProjectArtifact } from "./application/projectPipeline";
import logoMark from "./assets/logo-mark.svg";
import { platformCapabilities } from "./core/capabilities/platformCapabilities";
import { builderProjectSchema } from "./core/model/schema";
import { presetPacks } from "./core/presets/presetPacks";
import { regionPresets } from "./core/presets/regionPresets";
import {
  META_RULES_DAT_REPO,
  fetchMetaRulesDatRemoteCatalog,
  type MetaRulesDatRemoteItem,
} from "./core/sources/metaRulesDat";
import { defaultWizardState } from "./features/wizard/defaultWizardState";
import { downloadTextFile } from "./features/wizard/export";
import {
  clearWizardDraft,
  loadWizardDraft,
  saveWizardDraft,
} from "./features/wizard/persistence";
import { listRunningProcesses } from "./features/wizard/processPicker";
import {
  createCustomGroupId,
  createCustomGroupName,
  getAllGroupTargetIds,
  getPolicyTargetOptions,
  policyRefToTargetId,
  suggestTargetForPreset,
  suggestTargetForRemoteRule,
} from "./features/wizard/routingTargets";
import { targetDefinitions } from "./features/wizard/targetDefinitions";
import type { TargetPlatform } from "./core/model/types";
import type {
  WizardDomainRule,
  WizardPolicyTargetId,
  WizardProcessRule,
  WizardRegionGroup,
  WizardSubscription,
} from "./features/wizard/types";
import { messages } from "./i18n/messages";

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

export function App() {
  const initialDraft = loadWizardDraft();
  const [wizard, setWizard] = useState(initialDraft?.wizard ?? defaultWizardState);
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
  const showProcessSection = wizard.target === "windows-mihomo";

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
        nextAssignments[`preset:${presetId}`] = suggestTargetForPreset(preset);
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
        nextAssignments[`remote:${item.id}`] = suggestTargetForRemoteRule(item);
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
      customDomainRules:
        current.customDomainRules.length > 1
          ? current.customDomainRules.filter((rule) => rule.id !== ruleId)
          : [createDomainRuleDraft(1)],
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

  function exportYaml() {
    downloadTextFile(
      `${project.meta.name || "routing-project"}.yaml`,
      rendered.content,
      "text/yaml",
    );
  }

  function resetWizard() {
    setWizard(defaultWizardState);
    setCurrentStep(0);
    setRemoteQuery("");
    setImportMessage(t.draftCleared);
    setProcessStatus("idle");
    setRunningProcesses([]);
    setProcessError("");
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
        customDomainRules:
          customDomainRules.length > 0 ? customDomainRules : [createDomainRuleDraft(1)],
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
            <li>{t.guideStep1}</li>
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
            <strong>{capability.label}</strong>
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
                <div className="target-grid">
                  {targetDefinitions.map((target) => {
                    const localized = target.i18n?.[wizard.language];
                    return (
                      <button
                        className={`target-card ${wizard.target === target.id ? "target-card-active" : ""}`}
                        key={target.id}
                        onClick={() => updateTarget(target.id)}
                        type="button"
                      >
                        <span className="target-card-icon" dangerouslySetInnerHTML={{ __html: target.icon }} />
                        <strong>{localized?.title ?? target.title}</strong>
                        <span>{localized?.summary ?? target.summary}</span>
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
                      <div className="matrix-row" key={region.id}>
                        <div className="matrix-main-grid" style={{ gridTemplateColumns: "1fr 2fr 120px" }}>
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
                            {regexHelperId === region.id ? (
                              <div className="regex-helper">
                                <span className="regex-helper-label">{t.regexHelperToggle}</span>
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
                                <p className="regex-helper-hint">{t.regexHelperHint}</p>
                                {(regexInclude.trim() || regexExclude.trim()) ? (
                                  <div style={{ display: "grid", gap: "6px" }}>
                                    <code className="code-inline" style={{ fontSize: "0.78rem", wordBreak: "break-all", padding: "6px 10px" }}>
                                      {buildRegex(regexInclude, regexExclude)}
                                    </code>
                                    <button
                                      type="button"
                                      className="action-button"
                                      onClick={() => applyRegexToRegion(region.id)}
                                      style={{ justifySelf: "start" }}
                                    >
                                      {t.regexHelperGenerate}
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                            ) : null}
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
                        <div className="matrix-actions-row">
                          <button
                            className="action-button action-button-ghost"
                            type="button"
                            onClick={() => removeRegionGroup(region.id)}
                          >
                            {t.removeRegion}
                          </button>
                        </div>
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
                      const already = wizard.regionGroups.some((r) => r.id === preset.id);
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          className={`action-button ${already ? "" : "action-button-ghost"}`}
                          onClick={() => toggleRegionPreset(preset.id)}
                        >
                          {already ? "✓ " : ""}{wizard.language === "zh" ? preset.nameZh : preset.name}
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
                  {editableGroupTargetIds.map((targetId) => {
                    if (targetId === "group-default-proxy") {
                      return (
                        <label className="field" key={targetId}>
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
                      );
                    }

                    if (targetId === "group-ai-services") {
                      return (
                        <label className="field" key={targetId}>
                          <span>{t.aiGroupName}</span>
                          <input
                            value={wizard.aiGroupName}
                            onChange={(event) =>
                              setWizard((current) => ({
                                ...current,
                                aiGroupName: event.target.value,
                              }))
                            }
                          />
                        </label>
                      );
                    }

                    if (targetId === "group-streaming") {
                      return (
                        <label className="field" key={targetId}>
                          <span>{t.streamingGroupName}</span>
                          <input
                            value={wizard.streamingGroupName}
                            onChange={(event) =>
                              setWizard((current) => ({
                                ...current,
                                streamingGroupName: event.target.value,
                              }))
                            }
                          />
                        </label>
                      );
                    }

                    if (targetId === "group-apple") {
                      return (
                        <label className="field" key={targetId}>
                          <span>{t.appleGroupName}</span>
                          <input
                            value={wizard.appleGroupName}
                            onChange={(event) =>
                              setWizard((current) => ({
                                ...current,
                                appleGroupName: event.target.value,
                              }))
                            }
                          />
                        </label>
                      );
                    }

                    const customId = targetId.replace("group-custom:", "");
                    const customGroup = wizard.customGroups.find((group) => group.id === customId);

                    return (
                      <div className="inline-field-row" key={targetId}>
                        <label className="field inline-field-grow">
                          <span>{customGroup?.name ?? targetId}</span>
                          <input
                            value={customGroup?.name ?? ""}
                            onChange={(event) => updateCustomGroupName(customId, event.target.value)}
                          />
                        </label>
                        <button
                          type="button"
                          className="action-button action-button-ghost inline-remove-button"
                          onClick={() => removeCustomGroup(customId)}
                        >
                          {ux.removeGroup}
                        </button>
                      </div>
                    );
                  })}
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
                    {getAllGroupTargetIds(wizard).map((targetId) => {
                      const groupName =
                        targetId === "group-default-proxy" ? wizard.defaultProxyGroupName
                          : targetId === "group-ai-services" ? wizard.aiGroupName
                            : targetId === "group-streaming" ? wizard.streamingGroupName
                              : targetId === "group-apple" ? wizard.appleGroupName
                                : wizard.customGroups.find((g) => `group-custom:${g.id}` === targetId)?.name ?? targetId;
                      const selectedRegionIds = wizard.serviceGroupRegions[targetId] ?? [];
                      return (
                        <div className="region-assignment-block" key={targetId}>
                          <strong>{groupName}</strong>
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
                    >
                      {t.exportYaml}
                    </button>
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
                          <strong>{issue.severity.toUpperCase()}</strong>: {issue.message}
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
