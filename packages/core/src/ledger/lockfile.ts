/** Read/write the resolved-state ledger (quill.lock.json). */
import * as fs from "fs";
import * as path from "path";
import { Lockfile, AppliedEntry, CheckpointEntry } from "../types";

export const LOCKFILE_NAME = "quill.lock.json";

export function lockfilePath(projectDir: string): string {
  return path.join(projectDir, LOCKFILE_NAME);
}

export function emptyLockfile(stack: string, model: string): Lockfile {
  return { version: 1, stack, model, applied: [], checkpoints: [] };
}

export function readLockfile(projectDir: string): Lockfile | null {
  const p = lockfilePath(projectDir);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8")) as Lockfile;
}

export function writeLockfile(projectDir: string, lock: Lockfile): void {
  fs.writeFileSync(lockfilePath(projectDir), JSON.stringify(lock, null, 2) + "\n");
}

/** Ids of feature prompts already applied, in order. */
export function appliedIds(lock: Lockfile): string[] {
  return lock.applied.map((a) => a.id);
}

/** The head = id of the last applied prompt, or null. */
export function head(lock: Lockfile): string | null {
  return lock.applied.length ? lock.applied[lock.applied.length - 1].id : null;
}

export function recordApplied(lock: Lockfile, entry: AppliedEntry): void {
  const idx = lock.applied.findIndex((a) => a.id === entry.id);
  if (idx >= 0) lock.applied[idx] = entry;
  else lock.applied.push(entry);
}

export function upsertCheckpoint(lock: Lockfile, cp: CheckpointEntry): void {
  const idx = lock.checkpoints.findIndex((c) => c.name === cp.name);
  if (idx >= 0) lock.checkpoints[idx] = cp;
  else lock.checkpoints.push(cp);
}

export function findCheckpoint(
  lock: Lockfile,
  name: string
): CheckpointEntry | undefined {
  return lock.checkpoints.find((c) => c.name === name);
}

/** Truncate the applied ledger back to (and including) a given head id. */
export function truncateTo(lock: Lockfile, headId: string | null): void {
  if (headId === null) {
    lock.applied = [];
    return;
  }
  const idx = lock.applied.findIndex((a) => a.id === headId);
  if (idx >= 0) lock.applied = lock.applied.slice(0, idx + 1);
}
