/** Shared CLI helpers: project loading, logging, id/slug generation. */
import * as fs from "fs";
import * as path from "path";
import {
  QuillConfig,
  ProjectPaths,
  readConfig,
  resolvePaths,
  findProjectRoot,
} from "@quill/core";

export function log(msg = ""): void {
  process.stdout.write(msg + "\n");
}

export function die(msg: string): never {
  process.stderr.write(`\nError: ${msg}\n`);
  process.exit(1);
}

export interface LoadedProject {
  root: string;
  config: QuillConfig;
  paths: ProjectPaths;
}

/** Locate and load the Quill project containing the cwd. */
export function loadProject(): LoadedProject {
  const root = findProjectRoot(process.cwd());
  if (!root) {
    die(
      "not inside a Quill project (no quill.config.json found). Run 'create-quill-app <name>' to make one."
    );
  }
  const config = readConfig(root);
  return { root, config, paths: resolvePaths(root, config) };
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "feature";
}

/** Compute the next zero-padded feature id, e.g. "0003-add-projects". */
export function nextFeatureId(featureDir: string, title: string): string {
  let max = 0;
  if (fs.existsSync(featureDir)) {
    for (const f of fs.readdirSync(featureDir)) {
      const m = /^(\d+)/.exec(f);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
  }
  const num = String(max + 1).padStart(4, "0");
  return `${num}-${slugify(title)}`;
}

export function relFromRoot(root: string, p: string): string {
  return path.relative(root, p) || ".";
}

export function nowISO(): string {
  return new Date().toISOString();
}
