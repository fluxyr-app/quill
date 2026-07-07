/** Filesystem snapshots for checkpoints (copy/restore the generated app). */
import * as fs from "fs";
import * as path from "path";

const SKIP = new Set(["__pycache__", ".venv", "venv", ".pytest_cache", ".ruff_cache"]);

/** Recursively copy `src` to `dest`, skipping caches and build junk. */
export function copyDir(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else if (entry.isFile()) fs.copyFileSync(s, d);
  }
}

/** Replace `dest` contents with a copy of the snapshot at `src`. */
export function restoreDir(src: string, dest: string): void {
  fs.rmSync(dest, { recursive: true, force: true });
  copyDir(src, dest);
}
