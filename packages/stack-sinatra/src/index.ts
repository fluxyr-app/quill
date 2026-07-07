/**
 * @quill/stack-sinatra — a reference stack: Ruby + Sinatra with an in-memory
 * store. Reuses the SAME shared core conventions as every other stack; it
 * contributes only the framework binding, the scaffold templates, and verify().
 * Importing this module registers the "sinatra" stack.
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
import { verifySinatra } from "./verify";

const PKG_ROOT = path.resolve(__dirname, "..");
const BINDING = path.join(PKG_ROOT, "prompts", "binding.md");
const TEMPLATES = path.join(PKG_ROOT, "templates");

export const sinatraStack: StackAdapter = {
  name: "sinatra",

  scaffoldTemplates(): FileTemplate[] {
    return readTemplatesDir(TEMPLATES);
  },

  buildSystemPrompt(ctx: StackContext): string {
    const binding = fs.existsSync(BINDING) ? fs.readFileSync(BINDING, "utf8") : "";
    return composeStackSystemPrompt(ctx.corePrompts, binding);
  },

  verify(generatedDir: string): Promise<VerifyResult> {
    return verifySinatra(generatedDir);
  },
};

registerStack(sinatraStack);

export default sinatraStack;
