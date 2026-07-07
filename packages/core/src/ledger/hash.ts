/** Content hashing for prompts and generated code trees. */
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

function sha256(input: string | Buffer): string {
  return "sha256:" + crypto.createHash("sha256").update(input).digest("hex");
}

/** Hash a single prompt's normalized body. */
export function hashPrompt(body: string): string {
  return sha256(body.trim().replace(/\r\n/g, "\n"));
}

const IGNORED_DIRS = new Set([
  "__pycache__",
  ".git",
  ".venv",
  "venv",
  "node_modules",
  ".pytest_cache",
  ".ruff_cache",
  "instance",
]);

const IGNORED_FILES = new Set([".DS_Store"]);

/**
 * Deterministically hash a directory tree of source files: sorted relative
 * paths + contents. Used for the lockfile codeHash and drift detection.
 */
export function hashDir(root: string): string {
  if (!fs.existsSync(root)) return sha256("");
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name)
    )) {
      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) continue;
        walk(path.join(dir, entry.name));
      } else if (entry.isFile()) {
        if (IGNORED_FILES.has(entry.name)) continue;
        if (entry.name.endsWith(".pyc") || entry.name.endsWith(".sqlite3")) continue;
        files.push(path.join(dir, entry.name));
      }
    }
  };
  walk(root);
  const hash = crypto.createHash("sha256");
  for (const f of files.sort()) {
    const rel = path.relative(root, f).split(path.sep).join("/");
    hash.update(rel);
    hash.update("\0");
    hash.update(fs.readFileSync(f));
    hash.update("\0");
  }
  return "sha256:" + hash.digest("hex");
}
