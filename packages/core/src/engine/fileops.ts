/**
 * The file-ops protocol: the model returns a JSON object describing whole-file
 * writes/deletes; Quill parses and applies them. Whole-file writes (no diffs)
 * are the most reliable format across cheap models.
 */
import * as fs from "fs";
import * as path from "path";
import { FileOp } from "../types";

/** The protocol appended to the system prompt so the model emits parseable ops. */
export const FILE_OPS_PROTOCOL = [
  "## Output protocol",
  "",
  "Respond with ONE JSON object and nothing else (optionally inside a ```json",
  "fence). Shape:",
  "",
  "```json",
  '{ "files": [ { "path": "app/models/user.py", "action": "write", "content": "<FULL file contents>" } ], "notes": "one line" }',
  "```",
  "",
  "Rules:",
  '- "action" is "write" (create or fully overwrite) or "delete".',
  "- For every file you change, include its COMPLETE new contents. Never use",
  "  diffs, patches, ellipses, or `# unchanged` placeholders.",
  "- Only include files you are actually adding, changing, or deleting.",
  "- Paths are relative to the app root. Do not escape the app root.",
  "- Output valid JSON only — no prose before or after the object.",
].join("\n");

interface ParsedOps {
  ops: FileOp[];
  notes?: string;
}

/** Extract the JSON object from a model reply (tolerant of fences/prose). */
export function parseFileOps(text: string): ParsedOps {
  const candidate = extractJson(text);
  if (!candidate) return { ops: [] };
  let obj: any;
  try {
    obj = JSON.parse(candidate);
  } catch {
    return { ops: [] };
  }
  const files = Array.isArray(obj?.files) ? obj.files : [];
  const ops: FileOp[] = [];
  for (const f of files) {
    if (!f || typeof f.path !== "string") continue;
    const action = f.action === "delete" ? "delete" : "write";
    if (action === "write" && typeof f.content !== "string") continue;
    ops.push({ path: f.path, action, content: f.content });
  }
  return { ops, notes: typeof obj?.notes === "string" ? obj.notes : undefined };
}

/** Find the outermost JSON object, preferring a ```json fenced block. */
function extractJson(text: string): string | null {
  const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  if (fence) {
    const inner = fence[1].trim();
    if (inner.startsWith("{")) return inner;
  }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return null;
}

/** Apply file ops within `dir`, guarding against path traversal. Returns count. */
export function applyFileOps(dir: string, ops: FileOp[]): number {
  const root = path.resolve(dir);
  let applied = 0;
  for (const op of ops) {
    const dest = path.resolve(root, op.path);
    if (dest !== root && !dest.startsWith(root + path.sep)) {
      throw new Error(`refusing to write outside the app root: ${op.path}`);
    }
    if (op.action === "delete") {
      fs.rmSync(dest, { force: true });
    } else {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, op.content ?? "");
    }
    applied++;
  }
  return applied;
}

const SOURCE_EXT = new Set([
  ".py",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".rb",
  ".ru",
  ".txt",
  ".cfg",
  ".ini",
  ".toml",
  ".md",
]);
// Extensionless files worth including as context (by exact basename).
const SOURCE_FILES = new Set(["Gemfile", "Rakefile", "Procfile"]);
const SKIP_DIRS = new Set([
  "__pycache__",
  ".venv",
  "venv",
  ".git",
  ".pytest_cache",
  ".ruff_cache",
  "instance",
  ".quill",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".next",
  "vendor",
  ".bundle",
]);
const SKIP_FILES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "Gemfile.lock",
]);

/** Collect current source files (path + content) to give the model context. */
export function collectSource(
  dir: string,
  maxBytes = 24000
): { path: string; content: string }[] {
  const root = path.resolve(dir);
  const out: { path: string; content: string }[] = [];
  const walk = (cur: string) => {
    if (!fs.existsSync(cur)) return;
    for (const entry of fs.readdirSync(cur, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name)
    )) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const full = path.join(cur, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (
        entry.isFile() &&
        (SOURCE_EXT.has(path.extname(entry.name)) || SOURCE_FILES.has(entry.name))
      ) {
        if (SKIP_FILES.has(entry.name)) continue;
        const stat = fs.statSync(full);
        if (stat.size > maxBytes) continue;
        out.push({
          path: path.relative(root, full).split(path.sep).join("/"),
          content: fs.readFileSync(full, "utf8"),
        });
      }
    }
  };
  walk(root);
  return out;
}
