import { useMemo, useRef, useState } from "react";
import { buildProjectArtifact } from "./application/projectPipeline";
import { createProjectFromWizard } from "./application/createProjectFromWizard";
import { platformCapabilities } from "./core/capabilities/platformCapabilities";
import { builderProjectSchema } from "./core/model/schema";
import { presetPacks } from "./core/presets/presetPacks";
import { defaultWizardState } from "./features/wizard/defaultWizardState";
import { downloadTextFile } from "./features/wizard/export";
import { targetDefinitions } from "./features/wizard/targetDefinitions";
import type { TargetPlatform } from "./core/model/types";

export function App() {
  const [wizard, setWizard] = useState(defaultWizardState);
  const [importMessage, setImportMessage] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sourceProject = useMemo(() => createProjectFromWizard(wizard), [wizard]);
  const { project, validation, rendered } = buildProjectArtifact(sourceProject);
  const capability = platformCapabilities[project.meta.target];
  const availablePresets = presetPacks.filter((preset) =>
    preset.supportedTargets.includes(wizard.target),
  );

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
  }

  function togglePreset(presetId: string) {
    setWizard((current) => ({
      ...current,
      selectedPresetIds: current.selectedPresetIds.includes(presetId)
        ? current.selectedPresetIds.filter((id) => id !== presetId)
        : [...current.selectedPresetIds, presetId],
    }));
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

  async function handleImportProject(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const parsed = builderProjectSchema.parse(JSON.parse(text));
      setWizard({
        projectName: parsed.meta.name,
        target: parsed.meta.target,
        mode: parsed.meta.mode,
        selectedPresetIds: presetPacks
          .filter((preset) =>
            preset.ruleProviders.some((provider) =>
              parsed.ruleProviders.some((item) => item.name === provider.name),
            ),
          )
          .map((preset) => preset.id),
        enableLanDirect: parsed.settings.enableLanDirect,
        lanCidr:
          parsed.rules.find((rule) => rule.match.kind === "src_ip_cidr")?.match.value ??
          "192.168.1.0/24",
        processName:
          parsed.rules.find((rule) => rule.match.kind === "process_name")?.match.value ??
          "",
        customDomains: parsed.rules
          .filter((rule) => rule.id.startsWith("rule-custom-domain-"))
          .map((rule) => rule.match.value ?? "")
          .join("\n"),
      });
      setImportMessage(`Imported ${file.name}`);
    } catch (error) {
      setImportMessage(
        error instanceof Error ? `Import failed: ${error.message}` : "Import failed",
      );
    } finally {
      event.target.value = "";
    }
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">Cross-platform routing rule studio</p>
        <h1>clash-yaml-builder</h1>
        <p className="lede">
          A guided builder that separates user intent from target YAML, so we can
          support routers, Windows clients, macOS, and future mobile companions
          without turning every release into a rewrite.
        </p>
      </section>

      <section className="grid grid-wide">
        <article className="panel">
          <h2>Step 1. Choose Target</h2>
          <div className="target-grid">
            {targetDefinitions.map((target) => (
              <button
                className={`target-card ${wizard.target === target.id ? "target-card-active" : ""}`}
                key={target.id}
                onClick={() => updateTarget(target.id)}
                type="button"
              >
                <strong>{target.title}</strong>
                <span>{target.summary}</span>
                <small>{target.idealFor}</small>
              </button>
            ))}
          </div>
        </article>
      </section>

      <section className="grid">
        <article className="panel">
          <h2>Step 2. Project Basics</h2>
          <label className="field">
            <span>Project name</span>
            <input
              value={wizard.projectName}
              onChange={(event) =>
                setWizard((current) => ({ ...current, projectName: event.target.value }))
              }
            />
          </label>
          <label className="field">
            <span>Mode</span>
            <select
              value={wizard.mode}
              onChange={(event) =>
                setWizard((current) => ({
                  ...current,
                  mode: event.target.value as "simple" | "advanced",
                }))
              }
            >
              <option value="simple">Simple</option>
              <option value="advanced">Advanced</option>
            </select>
          </label>
          <div className="hint">
            <strong>{capability.label}</strong>
            <span>
              Process rules: {capability.supports.processRule ? "supported" : "not supported"}
            </span>
            <span>
              Source IP rules: {capability.supports.srcIpRule ? "supported" : "not supported"}
            </span>
          </div>
        </article>

        <article className="panel">
          <h2>Step 3. Pick Presets</h2>
          <div className="stack">
            {availablePresets.map((preset) => (
              <label className="check-row" key={preset.id}>
                <input
                  checked={wizard.selectedPresetIds.includes(preset.id)}
                  onChange={() => togglePreset(preset.id)}
                  type="checkbox"
                />
                <span>
                  <strong>{preset.name}</strong>
                  <small>{preset.description}</small>
                  {preset.sourceLabel ? (
                    <small>Source: {preset.sourceLabel}</small>
                  ) : null}
                </span>
              </label>
            ))}
          </div>
        </article>

        <article className="panel">
          <h2>Step 4. Routing Inputs</h2>
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
              <strong>Enable LAN direct routing</strong>
              <small>Useful for routers, NAS traffic, and local network devices.</small>
            </span>
          </label>
          <label className="field">
            <span>LAN CIDR</span>
            <input
              value={wizard.lanCidr}
              onChange={(event) =>
                setWizard((current) => ({ ...current, lanCidr: event.target.value }))
              }
            />
          </label>
          {wizard.target === "windows-mihomo" ? (
            <label className="field">
              <span>Windows process name</span>
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
          ) : null}
          <label className="field">
            <span>Custom domains, one per line</span>
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
        </article>
      </section>

      <section className="grid">
        <article className="panel">
          <h2>Step 5. Export</h2>
          <div className="action-row">
            <button className="action-button" onClick={exportProjectJson} type="button">
              Export project JSON
            </button>
            <button className="action-button action-button-secondary" onClick={exportYaml} type="button">
              Export YAML
            </button>
            <button
              className="action-button action-button-ghost"
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              Import project JSON
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
          <h2>Validation</h2>
          {validation.issues.length === 0 ? (
            <p>No validation issues in the current project.</p>
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
          <h2>Project JSON Preview</h2>
          <pre>{JSON.stringify(project, null, 2)}</pre>
        </article>

        <article className="panel">
          <h2>Rendered YAML Preview</h2>
          <pre>{rendered.content}</pre>
        </article>
      </section>
    </main>
  );
}
