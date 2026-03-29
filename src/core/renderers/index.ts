import type { BuilderProject, RenderedConfig } from "../model/types";
import { renderSparkle } from "./sparkle";
import { renderWindowsMihomo } from "./windowsMihomo";

export function renderTargetConfig(project: BuilderProject): RenderedConfig {
  switch (project.meta.target) {
    case "windows-mihomo":
      return renderWindowsMihomo(project);
    case "sparkle":
      return renderSparkle(project);
  }
}
