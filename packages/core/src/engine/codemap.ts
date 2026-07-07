/**
 * A compact map of the current generated app, injected into the feature prompt
 * so the model orients quickly (opencode can still open any file itself).
 */
import * as fs from "fs";
import * as path from "path";

const IGNORED = new Set([
  "__pycache__",
  ".opencode",
  ".git",
  ".venv",
  "venv",
  "node_modules",
  "vendor",
  ".bundle",
  "dist",
  ".pytest_cache",
  ".ruff_cache",
  "instance",
]);

function walk(root: string, dir: string, out: string[]): void {
  for (const entry of fs
    .readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))) {
    if (IGNORED.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    const rel = path.relative(root, full).split(path.sep).join("/");
    if (entry.isDirectory()) {
      walk(root, full, out);
    } else if (entry.isFile() && !entry.name.endsWith(".pyc")) {
      out.push(rel);
    }
  }
}

/** Extract top-level `class`/`def` signatures from a Python file. */
function pySignatures(file: string): string[] {
  try {
    const src = fs.readFileSync(file, "utf8");
    return src
      .split(/\r?\n/)
      .filter((l) => /^(class |def |@)/.test(l))
      .map((l) => l.trimEnd())
      .slice(0, 40);
  } catch {
    return [];
  }
}

/** Build a text code map: file tree + signatures for models/routes. */
export function buildCodeMap(generatedDir: string): string {
  if (!fs.existsSync(generatedDir)) return "(empty — no code generated yet)";
  const files: string[] = [];
  walk(generatedDir, generatedDir, files);
  if (!files.length) return "(empty — no code generated yet)";

  const lines: string[] = ["Files:"];
  for (const f of files) lines.push(`  ${f}`);

  const signatureTargets = files.filter(
    (f) =>
      f.endsWith(".py") &&
      (f.includes("/models/") || f.includes("/routes/") || f.endsWith("models.py") || f.endsWith("routes.py"))
  );
  if (signatureTargets.length) {
    lines.push("", "Signatures (models/routes):");
    for (const f of signatureTargets) {
      const sigs = pySignatures(path.join(generatedDir, f));
      if (sigs.length) {
        lines.push(`  ${f}:`);
        for (const s of sigs) lines.push(`    ${s}`);
      }
    }
  }
  return lines.join("\n");
}
