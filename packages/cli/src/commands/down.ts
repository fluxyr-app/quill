/** `quill down <checkpoint>` — restore a snapshot and truncate the ledger. */
import * as fs from "fs";
import * as path from "path";
import {
  readLockfile,
  writeLockfile,
  findCheckpoint,
  truncateTo,
  restoreDir,
} from "@quill/core";
import { loadProject, log, die } from "../util";

export function cmdDown(name: string): void {
  const { root, paths } = loadProject();
  const lock = readLockfile(root);
  if (!lock) die("no lockfile found.");

  const cp = findCheckpoint(lock!, name);
  if (!cp) die(`no checkpoint named '${name}'.`);

  const snapshotDir = path.join(root, cp!.snapshotDir);
  if (!fs.existsSync(snapshotDir)) die(`snapshot directory missing: ${cp!.snapshotDir}`);

  restoreDir(snapshotDir, paths.generated);
  truncateTo(lock!, cp!.head);
  writeLockfile(root, lock!);

  log(`✓ restored generated/ to checkpoint '${name}' (head: ${cp!.head || "none"}).`);
  log(`  Ledger truncated to that head.`);
}
