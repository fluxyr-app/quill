/**
 * Orchestration: scaffold the generated app, apply a single feature prompt
 * (one GenSession + repair loop), and full-regen from the prompt stack.
 */
import * as fs from "fs";
import * as path from "path";
import { LlmConfig, PromptDoc, StackAdapter } from "../types";
import { buildCodeMap } from "./codemap";
import { collectSource, FILE_OPS_PROTOCOL } from "./fileops";
import { GenSession } from "./session";
import { repairLoop } from "./repair";

export type Logger = (msg: string) => void;

/** Write the stack's verbatim scaffold templates into the generated app. */
export function scaffoldGenerated(params: {
  stack: StackAdapter;
  generatedDir: string;
}): void {
  const { stack, generatedDir } = params;
  fs.mkdirSync(generatedDir, { recursive: true });
  for (const tpl of stack.scaffoldTemplates()) {
    const dest = path.join(generatedDir, tpl.path);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, tpl.content);
  }
}

/** Compose the full system prompt: stack conventions + the file-ops protocol. */
export function composeSystemPrompt(
  stack: StackAdapter,
  corePrompts: PromptDoc[],
  generatedDir: string
): string {
  const conventions = stack.buildSystemPrompt({ corePrompts, generatedDir });
  return `${conventions}\n\n${FILE_OPS_PROTOCOL}\n`;
}

function buildFeatureMessage(prompt: PromptDoc, generatedDir: string): string {
  const files = collectSource(generatedDir);
  const fileBlocks = files
    .map((f) => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``)
    .join("\n\n");
  return [
    "Implement the following feature in this app. Follow the project conventions",
    "exactly (short-ID scheme, BaseModel, route/auth/error patterns). New model and",
    "route modules are auto-discovered — do not edit the app factory.",
    "",
    `## Feature: ${prompt.id}`,
    "",
    prompt.body,
    "",
    "## Current app structure",
    "",
    buildCodeMap(generatedDir),
    "",
    "## Current source files",
    "",
    fileBlocks || "(none yet)",
    "",
    "Add or modify the necessary models, routes, and tests. Respond using the",
    "output protocol with the full contents of every file you add or change.",
  ].join("\n");
}

export interface ApplyParams {
  prompt: PromptDoc;
  generatedDir: string;
  model: string;
  apiKey: string;
  llm: LlmConfig;
  system: string;
  stack: StackAdapter;
  log: Logger;
}

export interface ApplyResult {
  repairPasses: number;
  verified: boolean;
  detail: string;
}

/** Apply one feature prompt: initial generation, then the repair loop. */
export async function applyPrompt(params: ApplyParams): Promise<ApplyResult> {
  const { prompt, generatedDir, model, apiKey, llm, system, stack, log } = params;
  log(`▸ applying ${prompt.id}`);

  const session = new GenSession({ apiKey, model, system, generatedDir, llm, log });
  await session.send(buildFeatureMessage(prompt, generatedDir));

  const repair = await repairLoop({ session, generatedDir, llm, stack, log });
  return {
    repairPasses: repair.passes,
    verified: repair.verified,
    detail: repair.detail,
  };
}

export interface RegenParams {
  stack: StackAdapter;
  generatedDir: string;
  prompts: PromptDoc[];
  model: string;
  apiKey: string;
  llm: LlmConfig;
  corePrompts: PromptDoc[];
  log: Logger;
}

/** Full rebuild: reset to scaffold, then apply every feature prompt in order. */
export async function regenerate(params: RegenParams): Promise<ApplyResult[]> {
  const { stack, generatedDir, prompts, model, apiKey, llm, corePrompts, log } = params;
  log("▸ regenerating from prompt stack (full rebuild)");
  fs.rmSync(generatedDir, { recursive: true, force: true });
  scaffoldGenerated({ stack, generatedDir });

  const system = composeSystemPrompt(stack, corePrompts, generatedDir);
  const results: ApplyResult[] = [];
  for (const prompt of prompts) {
    results.push(
      await applyPrompt({
        prompt,
        generatedDir,
        model,
        apiKey,
        llm,
        system,
        stack,
        log,
      })
    );
  }
  return results;
}
