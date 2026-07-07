/** `quill regen [--from <checkpoint>]` — rebuild generated/ from the prompt stack. */
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
  findCheckpoint,
  hashPrompt,
  hashDir,
  regenerate,
} from "@quill/core";
import { loadProject, log, die, nowISO } from "../util";

export async function cmdRegen(opts: { from?: string }): Promise<void> {
  const { root, config, paths } = loadProject();
  const apiKey = ensureApiKey();

  const stack = getStack(config.stack);
  const model = config.model;
  const lock = readLockfile(root) ?? emptyLockfile(config.stack, model);

  const corePrompts = coreConventions(); // Quill-owned shared conventions
  const features = readPromptDir(paths.featurePrompts, "feature");
  const appliedSet = new Set(appliedIds(lock));
  let prompts = features.filter((f) => appliedSet.has(f.id));

  if (opts.from) {
    const cp = findCheckpoint(lock, opts.from);
    if (!cp) die(`no checkpoint named '${opts.from}'.`);
    const idx = prompts.findIndex((p) => p.id === cp!.head);
    prompts = idx >= 0 ? prompts.slice(0, idx + 1) : prompts;
  }

  const results = await regenerate({
    stack,
    generatedDir: paths.generated,
    prompts,
    model,
    apiKey,
    llm: config.llm,
    corePrompts,
    log,
  });

  // Refresh recorded code hashes for the rebuilt prompts.
  prompts.forEach((p, i) => {
    const r = results[i];
    recordApplied(lock, {
      id: p.id,
      promptHash: hashPrompt(p.body),
      codeHash: hashDir(paths.generated),
      model,
      repairPasses: r?.repairPasses ?? 0,
      appliedAt: nowISO(),
    });
  });
  writeLockfile(root, lock);

  const v = await stack.verify(paths.generated);
  log(
    v.ok
      ? `\n✓ regen complete; ${v.summary}.`
      : `\n⚠ regen complete but verification failed: ${v.summary}.`
  );
}
