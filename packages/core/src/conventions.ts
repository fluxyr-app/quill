/**
 * The shared, framework-agnostic **core conventions** — Quill's single source of
 * truth for how an application behaves (identifiers, resources, endpoints,
 * authorization, errors). They live in a fixed folder inside @fluxyr/quill-core and are
 * reused by every stack; a stack contributes only its framework binding, its
 * scaffold templates, and its verify(). Projects never copy these.
 */
import * as path from "path";
import { PromptDoc } from "./types";
import { readPromptDir } from "./prompt/parse";

const CONVENTIONS_DIR = path.resolve(__dirname, "..", "prompts");

/** Read the shared core conventions, ordered like migrations. */
export function coreConventions(): PromptDoc[] {
  return readPromptDir(CONVENTIONS_DIR, "core");
}
