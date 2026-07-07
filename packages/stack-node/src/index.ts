/**
 * @fluxyr/quill-stack-node — a reference stack: Node/TypeScript + Express with an
 * in-memory store. It reuses the SAME shared core conventions as every other
 * stack; it contributes only the framework binding, the scaffold templates, and
 * verify(). Importing this module registers the "node" stack.
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
} from "@fluxyr/quill-core";
import { verifyNode } from "./verify";

const PKG_ROOT = path.resolve(__dirname, "..");
const BINDING = path.join(PKG_ROOT, "prompts", "binding.md");
const TEMPLATES = path.join(PKG_ROOT, "templates");

export const nodeStack: StackAdapter = {
  name: "node",

  scaffoldTemplates(): FileTemplate[] {
    return readTemplatesDir(TEMPLATES);
  },

  buildSystemPrompt(ctx: StackContext): string {
    const binding = fs.existsSync(BINDING) ? fs.readFileSync(BINDING, "utf8") : "";
    return composeStackSystemPrompt(ctx.corePrompts, binding);
  },

  verify(generatedDir: string): Promise<VerifyResult> {
    return verifyNode(generatedDir);
  },
};

registerStack(nodeStack);

export default nodeStack;
