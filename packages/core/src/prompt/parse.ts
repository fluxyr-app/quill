/** Parsing of micro-prompt markdown files (frontmatter + body). */
import * as fs from "fs";
import * as path from "path";
import matter from "gray-matter";
import { PromptDoc, PromptKind } from "../types";

/** Extract the leading numeric order from an id like "0002-add-projects". */
export function orderFromId(id: string): number {
  const m = /^(\d+)/.exec(id);
  return m ? parseInt(m[1], 10) : 0;
}

/** Parse a single micro-prompt from raw markdown content. */
export function parsePrompt(
  raw: string,
  fallback: { id: string; kind: PromptKind; filePath?: string }
): PromptDoc {
  const { data, content } = matter(raw);
  const id = (data.id as string) || fallback.id;
  const kind = ((data.kind as string) || fallback.kind) as PromptKind;
  const dependsOn = Array.isArray(data.depends_on)
    ? (data.depends_on as string[])
    : [];
  return {
    id,
    kind,
    dependsOn,
    order: typeof data.order === "number" ? data.order : orderFromId(id),
    body: content.trim(),
    filePath: fallback.filePath,
  };
}

/** Read one micro-prompt file. */
export function readPromptFile(filePath: string, kind: PromptKind): PromptDoc {
  const raw = fs.readFileSync(filePath, "utf8");
  const id = path.basename(filePath).replace(/\.md$/, "");
  return parsePrompt(raw, { id, kind, filePath });
}

/** Read every `*.md` in a directory as prompts, sorted by numeric order then id. */
export function readPromptDir(dir: string, kind: PromptKind): PromptDoc[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => readPromptFile(path.join(dir, f), kind))
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

/** Render a prompt file's on-disk contents (frontmatter + body). */
export function renderPromptFile(doc: {
  id: string;
  kind: PromptKind;
  dependsOn?: string[];
  body: string;
}): string {
  const fm = matter.stringify(`\n${doc.body}\n`, {
    id: doc.id,
    kind: doc.kind,
    depends_on: doc.dependsOn ?? [],
  });
  return fm;
}
