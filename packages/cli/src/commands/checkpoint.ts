/**
 * `quill checkpoint <name>` — snapshot generated/ and verify that a full regen
 * from the prompt stack functionally reproduces the app.
 */
import * as fs from "fs";
import * as path from "path";
import {
  ensureApiKey,
  getStack,
  coreConventions,
  readLockfile,
  emptyLockfile,
  writeLockfile,
  readPromptDir,
  appliedIds,
  head,
  upsertCheckpoint,
  hashDir,
  copyDir,
  regenerate,
} from "@quill/core";
import { loadProject, log, die, nowISO } from "../util";

export async function cmdCheckpoint(name: string): Promise<void> {
  const { root, config, paths } = loadProject();
  const apiKey = ensureApiKey();

  const stack = getStack(config.stack);
  const model = config.model;
  const lock = readLockfile(root) ?? emptyLockfile(config.stack, model);
  if (lock.applied.length === 0) die("nothing to checkpoint — no prompts applied yet.");

  const corePrompts = coreConventions(); // Quill-owned shared conventions
  const features = readPromptDir(paths.featurePrompts, "feature");
  const appliedSet = new Set(appliedIds(lock));
  const appliedPrompts = features.filter((f) => appliedSet.has(f.id));

  // 1. Snapshot the current generated app.
  const snapshotDir = path.join(paths.checkpoints, name);
  fs.rmSync(snapshotDir, { recursive: true, force: true });
  copyDir(paths.generated, snapshotDir);
  const snapHash = hashDir(snapshotDir);
  log(`✓ snapshot saved: ${path.relative(root, snapshotDir)}`);

  // 2. Prove reproducibility: full regen into a temp dir, then verify.
  log(`\nVerifying reproducibility (full regen from ${appliedPrompts.length} prompt(s))...\n`);
  const tmp = path.join(paths.checkpoints, `.regen-${name}`);
  await regenerate({
    stack,
    generatedDir: tmp,
    prompts: appliedPrompts,
    model,
    apiKey,
    llm: config.llm,
    corePrompts,
    log,
  });

  // Reuse the project's already-installed dependencies so the reproducibility
  // check actually typechecks/tests the regenerated code (rather than soft-passing
  // on missing deps). Symlink whichever dep dir the stack uses.
  for (const dep of ["node_modules", ".venv"]) {
    const src = path.join(paths.generated, dep);
    const dest = path.join(tmp, dep);
    if (fs.existsSync(src) && !fs.existsSync(dest)) {
      try {
        fs.symlinkSync(src, dest, "dir");
      } catch {
        /* best-effort; verify soft-passes if deps remain unavailable */
      }
    }
  }

  const v = await stack.verify(tmp);

  // Remove the dep symlinks first so cleanup can never touch the real deps.
  for (const dep of ["node_modules", ".venv"]) {
    const dest = path.join(tmp, dep);
    try {
      if (fs.lstatSync(dest).isSymbolicLink()) fs.unlinkSync(dest);
    } catch {
      /* not present */
    }
  }
  fs.rmSync(tmp, { recursive: true, force: true });

  upsertCheckpoint(lock, {
    name,
    head: head(lock),
    snapshotDir: path.relative(root, snapshotDir),
    codeHash: snapHash,
    verified: v.ok,
    verifiedAt: nowISO(),
  });
  writeLockfile(root, lock);

  if (v.ok) {
    log(`\n✓ checkpoint '${name}' saved; a full regen reproduces the app (${v.summary}).`);
  } else {
    log(
      `\n⚠ checkpoint '${name}' saved, but a full regen did NOT pass verification ` +
        `(${v.summary}). The prompts may be under-specified for deterministic reproduction.`
    );
  }
}
