/** `quill up` — apply pending feature prompts incrementally via OpenRouter. */
import {
  ensureApiKey,
  getStack,
  coreConventions,
  readLockfile,
  emptyLockfile,
  writeLockfile,
  readPromptDir,
  appliedIds,
  recordApplied,
  hashPrompt,
  hashDir,
  composeSystemPrompt,
  applyPrompt,
} from "@fluxyr/quill-core";
import { loadProject, log, nowISO } from "../util";

export async function cmdUp(opts: { model?: string }): Promise<void> {
  const { root, config, paths } = loadProject();
  const apiKey = ensureApiKey();

  const stack = getStack(config.stack);
  const model = opts.model || config.model;
  const lock = readLockfile(root) ?? emptyLockfile(config.stack, model);

  const features = readPromptDir(paths.featurePrompts, "feature");
  const done = new Set(appliedIds(lock));
  const pending = features.filter((f) => !done.has(f.id));

  if (pending.length === 0) {
    log("Up to date — no pending feature prompts.");
    return;
  }

  // Core conventions are Quill-owned (shared, fixed folder), not project files.
  const system = composeSystemPrompt(stack, coreConventions(), paths.generated);

  log(`Applying ${pending.length} pending prompt(s) via OpenRouter (model: ${model})...\n`);

  for (const prompt of pending) {
    const res = await applyPrompt({
      prompt,
      generatedDir: paths.generated,
      model,
      apiKey,
      llm: config.llm,
      system,
      stack,
      log,
    });

    recordApplied(lock, {
      id: prompt.id,
      promptHash: hashPrompt(prompt.body),
      codeHash: hashDir(paths.generated),
      model,
      repairPasses: res.repairPasses,
      appliedAt: nowISO(),
    });
    writeLockfile(root, lock);

    if (!res.verified) {
      log(
        `\n⚠ ${prompt.id} applied but verification did not pass ` +
          `(${res.detail.split("\n")[0]}).`
      );
      log("  Recorded in the lockfile. Refine the prompt and re-run 'quill up', or inspect generated/.");
      return;
    }
    log(`✓ ${prompt.id}  (repair passes: ${res.repairPasses})\n`);
  }

  log(`✓ Up to date — applied ${pending.length} prompt(s).`);
}
