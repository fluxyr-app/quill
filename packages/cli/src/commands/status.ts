/** `quill status` — applied vs pending prompts, plus drift vs the lockfile. */
import {
  getStack,
  readLockfile,
  emptyLockfile,
  readPromptDir,
  hashPrompt,
  hashDir,
} from "@fluxyr/quill-core";
import { loadProject, log } from "../util";

export function cmdStatus(): void {
  const { root, config, paths } = loadProject();
  // Validate the stack is known (throws a helpful error otherwise).
  getStack(config.stack);

  const lock = readLockfile(root) ?? emptyLockfile(config.stack, config.model);
  const features = readPromptDir(paths.featurePrompts, "feature");
  const applied = new Map(lock.applied.map((a) => [a.id, a]));

  log(`Stack:  ${config.stack}`);
  log(`Model:  ${config.model || "(opencode default)"}`);

  log(`\nFeature prompts:`);
  if (features.length === 0) log("  (none — create one with: quill new \"...\")");
  let pending = 0;
  for (const f of features) {
    const a = applied.get(f.id);
    if (!a) {
      pending++;
      log(`  ⧗ pending   ${f.id}`);
    } else if (a.promptHash !== hashPrompt(f.body)) {
      pending++;
      log(`  ✎ edited    ${f.id}   (changed since applied — re-run 'quill up')`);
    } else {
      log(`  ✓ applied   ${f.id}`);
    }
  }

  // Code drift: has generated/ diverged from what the lockfile recorded?
  if (lock.applied.length) {
    const lastCode = lock.applied[lock.applied.length - 1].codeHash;
    if (hashDir(paths.generated) !== lastCode) {
      log(
        `\n⚠ generated/ has drifted from the lockfile (hand-edited?).` +
          ` Run 'quill regen' to rebuild from the prompt stack.`
      );
    }
  }

  if (lock.checkpoints.length) {
    log(`\nCheckpoints:`);
    for (const c of lock.checkpoints) {
      log(`  ${c.verified ? "✓" : "✗"} ${c.name}   (head: ${c.head || "none"})`);
    }
  }

  log(`\n${lock.applied.length} applied, ${pending} pending.`);
}
