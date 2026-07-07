/** `quill diff` — what `quill up`/`regen` would change: pending & edited prompts. */
import {
  readLockfile,
  emptyLockfile,
  readPromptDir,
  hashPrompt,
  hashDir,
} from "@fluxyr/quill-core";
import { loadProject, log } from "../util";

function preview(body: string): string {
  const line = body.split("\n").find((l) => l.trim() && !l.trim().startsWith("<!--"));
  return (line ?? "").slice(0, 80);
}

export function cmdDiff(): void {
  const { root, config, paths } = loadProject();
  const lock = readLockfile(root) ?? emptyLockfile(config.stack, config.model);
  const features = readPromptDir(paths.featurePrompts, "feature");
  const applied = new Map(lock.applied.map((a) => [a.id, a]));

  const pending = features.filter((f) => !applied.has(f.id));
  const edited = features.filter((f) => {
    const a = applied.get(f.id);
    return a && a.promptHash !== hashPrompt(f.body);
  });

  if (pending.length === 0 && edited.length === 0) {
    log("No prompt changes pending. generated/ is in sync with the prompt stack.");
  } else {
    if (pending.length) {
      log(`Pending (will be applied by 'quill up'):`);
      for (const p of pending) log(`  + ${p.id}   ${preview(p.body)}`);
    }
    if (edited.length) {
      log(`\nEdited since applied (re-apply with 'quill up'):`);
      for (const p of edited) log(`  ~ ${p.id}   ${preview(p.body)}`);
    }
  }

  if (lock.applied.length) {
    const lastCode = lock.applied[lock.applied.length - 1].codeHash;
    if (hashDir(paths.generated) !== lastCode) {
      log(`\n⚠ generated/ has drifted from the lockfile (hand-edited?).`);
    }
  }
}
