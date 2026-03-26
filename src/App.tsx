import { useEffect, useMemo, useRef, useState } from "react";
import { createProjectFromWizard } from "./application/createProjectFromWizard";
import { explainProject } from "./application/explainProject";
import { buildProjectArtifact } from "./application/projectPipeline";
import logoMark from "./assets/logo-mark.svg";
import { platformCapabilities } from "./core/capabilities/platformCapabilities";
import { builderProjectSchema } from "./core/model/schema";
import { presetPacks } from "./core/presets/presetPacks";
import {
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
  getActiveGroupTargetIds,
  getPolicyTargetOptions,
  policyRefToTargetId,
  suggestTargetForPreset,
  suggestTargetForRemoteRule,
} from "./features/wizard/routingTargets";
import { targetDefinitions } from "./features/wizard/targetDefinitions";
import type { TargetPlatform } from "./core/model/types";
import type { WizardPolicyTargetId } from "./features/wizard/types";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = messages[wizard.language];

  const wizardSteps = [
    { id: 0, title: t.stepTarget },
    { id: 1, title: t.stepBasics },
    { id: 2, title: t.stepPresets },
    { id: 3, title: t.stepInputs },
    { id: 4, title: t.stepReview },
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
      })),
    ),
    ...selectedRemoteItems.map((item) => ({
      key: `remote-${item.id}`,
      providerName: item.providerName,
      preset: item.kind === "geosite" ? t.remoteKindGeosite : t.remoteKindGeoip,
      sourceLabel: item.sourceLabel,
      sourceUrl: item.url,
    })),
  ];
  const bundlePresets = selectedPresets.filter((preset) => preset.style !== "service");
  const servicePresets = selectedPresets.filter((preset) => preset.style === "service");
  const policyTargetOptions = getPolicyTargetOptions(wizard, wizard.language);
  const activeGroupTargetIds = getActiveGroupTargetIds(wizard);
  const selectedRoutingItems = [
    ...selectedPresets.map((preset) => ({
      key: `preset:${preset.id}`,
      title: preset.i18n?.[wizard.language]?.name ?? preset.name,
      description: preset.i18n?.[wizard.language]?.description ?? preset.description,
      sourceLabel: preset.sourceLabel ?? "",
    })),
    ...selectedRemoteItems.map((item) => ({
      key: `remote:${item.id}`,
      title: item.providerName,
      description:
        item.kind === "geoip"
          ? `${t.remoteKindGeoip} · ${item.name}`
          : `${t.remoteKindGeosite} · ${item.name}`,
      sourceLabel: item.sourceLabel,
    })),
  ];
  const showProcessSection = wizard.target === "windows-mihomo";

  useEffect(() => {
    saveWizardDraft(wizard, currentStep);
  }, [wizard, currentStep]);

  useEffect(() => {
    if (currentStep !== 2 || remoteStatus !== "idle") {
      return;
    }

    void syncRemoteRules();
  }, [currentStep, remoteStatus]);

  useEffect(() => {
    if (currentStep !== 3 || !showProcessSection || processStatus !== "idle") {
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

  function goToStep(step: number) {
    setCurrentStep(Math.max(0, Math.min(step, wizardSteps.length - 1)));
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

      if (exists) {
        delete nextAssignments[`remote:${item.id}`];
      } else {
        nextAssignments[`remote:${item.id}`] = suggestTargetForRemoteRule(item);
      }

      return {
        ...current,
        selectedRemoteRuleIds,
        ruleAssignments: nextAssignments,
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
      const selectedPresetIds = presetPacks
        .filter((preset) =>
          preset.ruleProviders.some((provider) =>
            parsed.ruleProviders.some((item) => item.name === provider.name),
          ),
        )
        .map((preset) => preset.id);
      const selectedRemoteRuleIds = parsed.ruleProviders
        .map((provider) => provider.name)
        .filter((name) => name.startsWith("geosite:") || name.startsWith("geoip:"));

      const nextAssignments: Record<string, WizardPolicyTargetId> = {};
      const customDomainRule = parsed.rules.find((rule) =>
        rule.id.startsWith("rule-custom-domain-"),
      );
      const processRule = parsed.rules.find((rule) => rule.match.kind === "process_name");
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
      const importedState = {
        ...defaultWizardState,
        defaultProxyGroupName:
          parsed.groups.find((group) => group.id === "group-default-proxy")?.name ??
          "Default Proxy",
        aiGroupName:
          parsed.groups.find((group) => group.id === "group-ai-services")?.name ??
          "AI Services",
        streamingGroupName:
          parsed.groups.find((group) => group.id === "group-streaming")?.name ??
          "Streaming",
        appleGroupName:
          parsed.groups.find((group) => group.id === "group-apple")?.name ?? "Apple",
        customGroups,
      };
      selectedPresetIds.forEach((presetId) => {
        const preset = presetPacks.find((item) => item.id === presetId);
        const firstProviderName = preset?.ruleProviders[0]?.name;
        const matchedRule = parsed.rules.find((rule) => rule.match.value === firstProviderName);
        nextAssignments[`preset:${presetId}`] = matchedRule
          ? policyRefToTargetId(matchedRule.policy, importedState)
          : "group-default-proxy";
      });
      selectedRemoteRuleIds.forEach((remoteId) => {
        const matchedRule = parsed.rules.find((rule) => rule.match.value === remoteId);
        nextAssignments[`remote:${remoteId}`] = matchedRule
          ? policyRefToTargetId(matchedRule.policy, importedState)
          : "group-default-proxy";
      });

      setWizard({
        language: wizard.language,
        projectName: parsed.meta.name,
        target: parsed.meta.target,
        mode: parsed.meta.mode,
        selectedPresetIds,
        selectedRemoteRuleIds,
        ruleAssignments: nextAssignments,
        defaultProxyGroupName:
          importedState.defaultProxyGroupName,
        aiGroupName:
          importedState.aiGroupName,
        streamingGroupName:
          importedState.streamingGroupName,
        appleGroupName:
          importedState.appleGroupName,
        customGroups,
        finalPolicyMode:
          parsed.settings.finalPolicy.kind === "builtin" &&
          parsed.settings.finalPolicy.value === "DIRECT"
            ? "direct"
            : "default-proxy",
        enableLanDirect: parsed.settings.enableLanDirect,
        lanCidr:
          parsed.rules.find((rule) => rule.match.kind === "src_ip_cidr")?.match.value ??
          "192.168.1.0/24",
        processName: processRule?.match.value ?? "",
        processTarget: processRule
          ? policyRefToTargetId(processRule.policy, importedState)
          : "group-default-proxy",
        customDomains: parsed.rules
          .filter((rule) => rule.id.startsWith("rule-custom-domain-"))
          .map((rule) => rule.match.value ?? "")
          .join("\n"),
        customDomainTarget: customDomainRule
          ? policyRefToTargetId(customDomainRule.policy, importedState)
          : "group-default-proxy",
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

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="hero-topbar">
          <div className="hero-brand">
            <img src={logoMark} alt="" className="hero-logo" />
            <div className="hero-brand-copy">
              <p className="eyebrow">{t.heroEyebrow}</p>
              <p className="brand-support">{t.heroSupport}</p>
            </div>
          </div>
          <label className="language-switcher">
            <span className="language-label">{t.language}</span>
            <select
              value={wizard.language}
              onChange={(event) =>
                setWizard((current) => ({
                  ...current,
                  language: event.target.value as "en" | "zh",
                }))
              }
            >
              <option value="zh">{t.chinese}</option>
              <option value="en">{t.english}</option>
            </select>
          </label>
        </div>
        <h1>clash-yaml-builder</h1>
        <p className="lede">{t.heroDescription}</p>
      </section>

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
                        <strong>{localized?.title ?? target.title}</strong>
                        <span>{localized?.summary ?? target.summary}</span>
                        <small>{localized?.idealFor ?? target.idealFor}</small>
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
                <label className="field">
                  <span>{t.mode}</span>
                  <select
                    value={wizard.mode}
                    onChange={(event) =>
                      setWizard((current) => ({
                        ...current,
                        mode: event.target.value as "simple" | "advanced",
                      }))
                    }
                  >
                    <option value="simple">{t.simple}</option>
                    <option value="advanced">{t.advanced}</option>
                  </select>
                </label>
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
                <div className="hint">
                  <strong>{capability.label}</strong>
                  <span>
                    {capability.supports.processRule
                      ? t.processRulesSupported
                      : t.processRulesUnsupported}
                  </span>
                  <span>
                    {capability.supports.srcIpRule
                      ? t.srcIpRulesSupported
                      : t.srcIpRulesUnsupported}
                  </span>
                </div>
              </article>
            </section>
          ) : null}

          {currentStep === 2 ? (
            <section className="grid">
              <article className="panel">
                <h2>{t.step3}</h2>
                <div className="hint hint-compact">
                  <strong>{t.tip}</strong>
                  <span>{t.presetTip}</span>
                </div>

                <div className="catalog-block">
                  <div className="catalog-header">
                    <h3>{t.quickPresets}</h3>
                  </div>
                  <div className="stack">
                    {groupedPresets.map(([category, presets]) => (
                      <div className="preset-group" key={category}>
                        <h3>{presetCategoryLabels[category as keyof typeof presetCategoryLabels]}</h3>
                        <div className="stack">
                          {presets.map((preset) => {
                            const localized = preset.i18n?.[wizard.language];
                            return (
                              <label className="check-row" key={preset.id}>
                                <input
                                  checked={wizard.selectedPresetIds.includes(preset.id)}
                                  onChange={() => togglePreset(preset.id)}
                                  type="checkbox"
                                />
                                <span>
                                  <strong>{localized?.name ?? preset.name}</strong>
                                  <small>{localized?.description ?? preset.description}</small>
                                  <small>
                                    {preset.style === "service" ? t.typeService : t.typeBundle}
                                  </small>
                                  {preset.sourceLabel ? (
                                    <small>
                                      {t.source}: {preset.sourceLabel}
                                    </small>
                                  ) : null}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
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
                      {remoteCatalog.length > 0 ? t.refreshRemoteRules : t.syncRemoteRules}
                    </button>
                  </div>
                  {remoteStatus === "loading" ? (
                    <p className="helper-text">{t.syncingRemoteRules}</p>
                  ) : null}
                  {remoteStatus === "error" ? (
                    <p className="helper-text">
                      {t.remoteRulesFailed}
                      {remoteError ? ` ${remoteError}` : ""}
                    </p>
                  ) : null}
                  {lastSyncedAt ? (
                    <p className="helper-text">
                      {t.lastSyncedAt}: {formatSyncTime(lastSyncedAt, wizard.language)}
                    </p>
                  ) : null}
                  <label className="field">
                    <span>{t.searchRemoteRules}</span>
                    <input
                      value={remoteQuery}
                      placeholder={t.searchRemoteRulesPlaceholder}
                      onChange={(event) => setRemoteQuery(event.target.value)}
                    />
                  </label>
                  {remoteCatalog.length === 0 && remoteStatus !== "loading" ? (
                    <p className="empty-state">{t.noRemoteRulesYet}</p>
                  ) : null}
                  {remoteCatalog.length > 0 && filteredRemoteCatalog.length === 0 ? (
                    <p className="empty-state">{t.noRemoteMatches}</p>
                  ) : null}
                  {filteredRemoteCatalog.length > 0 ? (
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
                        <strong>{source.providerName}</strong>
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

          {currentStep === 3 ? (
            <section className="grid">
              <article className="panel">
                <h2>{t.step4}</h2>

                <div className="section-block">
                  <div className="section-heading">
                    <h3>{t.routingGroupSection}</h3>
                    <p>{t.routingGroupSectionHelp}</p>
                  </div>
                  {activeGroupTargetIds.map((targetId) => {
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
                      <label className="field" key={targetId}>
                        <span>{customGroup?.name ?? targetId}</span>
                        <input
                          value={customGroup?.name ?? ""}
                          onChange={(event) =>
                            setWizard((current) => ({
                              ...current,
                              customGroups: current.customGroups.map((group) =>
                                group.id === customId
                                  ? { ...group, name: event.target.value }
                                  : group,
                              ),
                            }))
                          }
                        />
                      </label>
                    );
                  })}
                  <button
                    type="button"
                    className="action-button action-button-ghost"
                    onClick={() =>
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
                      })
                    }
                  >
                    {t.addCustomGroup}
                  </button>
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
                              setWizard((current) => ({
                                ...current,
                                ruleAssignments: {
                                  ...current.ruleAssignments,
                                  [item.key]: event.target.value as WizardPolicyTargetId,
                                },
                              }))
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
                  </label>
                </div>

                <div className="section-block">
                  <div className="section-heading">
                    <h3>{t.processSection}</h3>
                    <p>{t.processSectionHelp}</p>
                  </div>
                  {showProcessSection ? (
                    <>
                      <label className="field">
                        <span>{t.processName}</span>
                        <input
                          value={wizard.processName}
                          onChange={(event) =>
                            setWizard((current) => ({
                              ...current,
                              processName: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <p className="helper-text">{t.processNameHelp}</p>
                      <div className="process-picker-row">
                        <button
                          className="action-button action-button-ghost"
                          type="button"
                          onClick={() => void refreshRunningProcesses()}
                          disabled={processStatus === "loading"}
                        >
                          {runningProcesses.length > 0 ? t.refreshProcesses : t.detectProcesses}
                        </button>
                        <select
                          className="process-select"
                          value=""
                          onChange={(event) => {
                            if (!event.target.value) {
                              return;
                            }

                            setWizard((current) => ({
                              ...current,
                              processName: event.target.value,
                            }));
                          }}
                          disabled={runningProcesses.length === 0}
                        >
                          <option value="">{t.chooseProcess}</option>
                          {runningProcesses.map((processName) => (
                            <option key={processName} value={processName}>
                              {processName}
                            </option>
                          ))}
                        </select>
                      </div>
                      <label className="field">
                        <span>{t.processTarget}</span>
                        <select
                          value={wizard.processTarget}
                          onChange={(event) =>
                            setWizard((current) => ({
                              ...current,
                              processTarget: event.target.value as WizardPolicyTargetId,
                            }))
                          }
                        >
                          {policyTargetOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      {processStatus === "loading" ? (
                        <p className="helper-text">{t.loadingProcesses}</p>
                      ) : null}
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
                  ) : (
                    <p className="helper-text">{t.processRoutingUnavailable}</p>
                  )}
                </div>

                <div className="section-block">
                  <div className="section-heading">
                    <h3>{t.customDomainSection}</h3>
                    <p>{t.customDomainSectionHelp}</p>
                  </div>
                  <label className="field">
                    <span>{t.customDomainTarget}</span>
                    <select
                      value={wizard.customDomainTarget}
                      onChange={(event) =>
                        setWizard((current) => ({
                          ...current,
                          customDomainTarget: event.target.value as WizardPolicyTargetId,
                        }))
                      }
                    >
                      {policyTargetOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>{t.customDomains}</span>
                    <textarea
                      rows={6}
                      value={wizard.customDomains}
                      onChange={(event) =>
                        setWizard((current) => ({
                          ...current,
                          customDomains: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>
              </article>
            </section>
          ) : null}

          {currentStep === 4 ? (
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
              onClick={() => goToStep(currentStep - 1)}
              disabled={currentStep === 0}
            >
              {t.previous}
            </button>
            <button
              type="button"
              className="action-button"
              onClick={() => goToStep(currentStep + 1)}
              disabled={currentStep === wizardSteps.length - 1}
            >
              {t.next}
            </button>
          </section>
        </div>
      </section>
    </main>
  );
}
