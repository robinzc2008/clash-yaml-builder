import { normalizeProject } from "../core/normalization/normalizeProject";
import { renderTargetConfig } from "../core/renderers";
import { validateProject } from "../core/validation/validateProject";
import type { BuilderProject } from "../core/model/types";

export function buildProjectArtifact(project: BuilderProject) {
  const normalizedProject = normalizeProject(project);
  const validation = validateProject(normalizedProject);
  const rendered = renderTargetConfig(normalizedProject);

  return {
    project: normalizedProject,
    validation,
    rendered,
  };
}
