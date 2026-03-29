import type { BuilderProject, RenderedConfig } from "../model/types";
import { renderClashMetaStyle } from "./clashMetaYaml";

export function renderSparkle(project: BuilderProject): RenderedConfig {
  return renderClashMetaStyle(project, "sparkle");
}
