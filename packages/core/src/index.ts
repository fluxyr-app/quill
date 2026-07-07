/** Public API of the Quill engine. */
export * from "./types";
export * from "./config";

export {
  parsePrompt,
  readPromptFile,
  readPromptDir,
  renderPromptFile,
  orderFromId,
} from "./prompt/parse";

export { hashPrompt, hashDir } from "./ledger/hash";
export {
  LOCKFILE_NAME,
  lockfilePath,
  emptyLockfile,
  readLockfile,
  writeLockfile,
  appliedIds,
  head,
  recordApplied,
  upsertCheckpoint,
  findCheckpoint,
  truncateTo,
} from "./ledger/lockfile";
export { copyDir, restoreDir } from "./ledger/snapshot";

export { coreConventions } from "./conventions";

export { registerStack, getStack, listStacks } from "./stack/registry";
export { readTemplatesDir, composeStackSystemPrompt } from "./stack/helpers";

export { ensureApiKey, chat } from "./engine/openrouter";
export {
  parseFileOps,
  applyFileOps,
  collectSource,
  FILE_OPS_PROTOCOL,
} from "./engine/fileops";
export { GenSession } from "./engine/session";
export { buildCodeMap } from "./engine/codemap";
export { repairLoop } from "./engine/repair";
export {
  scaffoldGenerated,
  composeSystemPrompt,
  applyPrompt,
  regenerate,
  type Logger,
  type ApplyResult,
} from "./engine/generate";
