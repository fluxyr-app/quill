/** Load/save quill.config.json and resolve project paths. */
import * as fs from "fs";
import * as path from "path";
import { QuillConfig } from "./types";

export const CONFIG_NAME = "quill.config.json";

/** Article value-winner: cheap model + one self-review pass ≈ frontier correctness. */
export const DEFAULT_MODEL = "minimax/minimax-m3";

export function defaultConfig(stack: string, model: string): QuillConfig {
  return {
    stack,
    model: model || DEFAULT_MODEL,
    paths: { prompts: "prompts", generated: "generated" },
    llm: {
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      maxRepairPasses: 2,
      temperature: 0,
      selfReview: true,
    },
  };
}

export function configPath(projectDir: string): string {
  return path.join(projectDir, CONFIG_NAME);
}

export function readConfig(projectDir: string): QuillConfig {
  const p = configPath(projectDir);
  if (!fs.existsSync(p)) {
    throw new Error(
      `No ${CONFIG_NAME} found in ${projectDir}. Run 'create-quill-app' first, or cd into a Quill project.`
    );
  }
  return JSON.parse(fs.readFileSync(p, "utf8")) as QuillConfig;
}

export function writeConfig(projectDir: string, config: QuillConfig): void {
  fs.writeFileSync(configPath(projectDir), JSON.stringify(config, null, 2) + "\n");
}

/**
 * Resolved absolute paths for a project. Note: core conventions (the shared,
 * framework-agnostic prompts) are NOT here — they are Quill-owned and read from
 * @fluxyr/quill-core via `coreConventions()`. A project's `prompts/` folder holds only
 * its own feature prompts (directly, no subfolder).
 */
export interface ProjectPaths {
  root: string;
  featurePrompts: string;
  generated: string;
  checkpoints: string;
}

export function resolvePaths(projectDir: string, config: QuillConfig): ProjectPaths {
  return {
    root: projectDir,
    // Feature prompts live directly under prompts/ (core prompts are Quill-owned).
    featurePrompts: path.join(projectDir, config.paths.prompts),
    generated: path.join(projectDir, config.paths.generated),
    checkpoints: path.join(projectDir, ".quill", "checkpoints"),
  };
}

/** Walk up from `start` to find the directory containing quill.config.json. */
export function findProjectRoot(start: string): string | null {
  let dir = path.resolve(start);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (fs.existsSync(path.join(dir, CONFIG_NAME))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}
