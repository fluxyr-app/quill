/** Shared helpers for building stack adapters. */
import * as fs from "fs";
import * as path from "path";
import { FileTemplate, PromptDoc } from "../types";

/** Recursively read every file under `dir` into FileTemplate[] (paths relative to dir). */
export function readTemplatesDir(dir: string): FileTemplate[] {
  const out: FileTemplate[] = [];
  const walk = (cur: string) => {
    if (!fs.existsSync(cur)) return;
    for (const entry of fs.readdirSync(cur, { withFileTypes: true })) {
      const full = path.join(cur, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) {
        out.push({
          path: path.relative(dir, full).split(path.sep).join("/"),
          content: fs.readFileSync(full, "utf8"),
        });
      }
    }
  };
  walk(dir);
  return out;
}

const HEADER = [
  "# Quill — application conventions",
  "",
  "You are evolving a web application from a stack of micro-prompts. The",
  "CONVENTIONS section is the durable, framework-independent contract for this app.",
  "The FRAMEWORK BINDING section says how to realize those conventions in this",
  "project's stack — follow both exactly. Some load-bearing files are already",
  "provided; anything a convention or the binding says to implement, you generate.",
  "New resource and route modules are auto-discovered; do not edit the app's",
  "bootstrap/registration.",
  "",
  "## Conventions (framework-independent)",
  "",
].join("\n");

/**
 * Compose a stack's system prompt: the shared header, the core conventions, then
 * the stack's framework binding.
 */
export function composeStackSystemPrompt(
  corePrompts: PromptDoc[],
  binding: string
): string {
  const conventions = corePrompts.map((p) => p.body).join("\n\n---\n\n");
  return `${HEADER}${conventions}\n\n## Framework binding\n\n${binding}\n`;
}
