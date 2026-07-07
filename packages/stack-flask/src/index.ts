/**
 * @quill/stack-flask — the reference stack: Python/Flask/SQLAlchemy, flavored
 * after fluxyr (Base-62 short IDs, BaseModel, account-scoped blueprints).
 *
 * Importing this module registers the "flask" stack with @quill/core. Core
 * conventions are shared (owned by @quill/core); this stack contributes only the
 * framework binding, the scaffold templates, and verify().
 */
import * as fs from "fs";
import * as path from "path";
import {
  FileTemplate,
  StackAdapter,
  StackContext,
  VerifyResult,
  readTemplatesDir,
  composeStackSystemPrompt,
  registerStack,
} from "@quill/core";
import { verifyFlask } from "./verify";

const PKG_ROOT = path.resolve(__dirname, "..");
const BINDING = path.join(PKG_ROOT, "prompts", "binding.md");
const TEMPLATES = path.join(PKG_ROOT, "templates");

export const flaskStack: StackAdapter = {
  name: "flask",

  scaffoldTemplates(): FileTemplate[] {
    return readTemplatesDir(TEMPLATES);
  },

  buildSystemPrompt(ctx: StackContext): string {
    const binding = fs.existsSync(BINDING) ? fs.readFileSync(BINDING, "utf8") : "";
    return composeStackSystemPrompt(ctx.corePrompts, binding);
  },

  verify(generatedDir: string): Promise<VerifyResult> {
    return verifyFlask(generatedDir);
  },
};

registerStack(flaskStack);

export default flaskStack;
