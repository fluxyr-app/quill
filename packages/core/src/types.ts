/**
 * Shared types for the Quill engine.
 *
 * Quill treats a web app as an ordered stack of micro-prompts (the durable
 * asset) plus a resolved state (the lockfile). Code is a derived artifact,
 * generated/evolved by opencode and verified by a stack adapter.
 */

export type PromptKind = "core" | "feature";

/** A single micro-prompt: natural-language spec + metadata. */
export interface PromptDoc {
  /** Stable id, e.g. "0002-add-projects". */
  id: string;
  kind: PromptKind;
  /** Ids this prompt depends on (informational; ordering is by `order`). */
  dependsOn: string[];
  /** Numeric prefix used to order feature prompts like migrations. */
  order: number;
  /** The natural-language specification. */
  body: string;
  /** Absolute path to the source markdown, when read from disk. */
  filePath?: string;
}

/** A non-generated file copied verbatim into the generated app on init. */
export interface FileTemplate {
  /** Path relative to the generated app root. */
  path: string;
  content: string;
}

/** Result of a stack adapter's verify() — feeds the repair loop. */
export interface VerifyResult {
  ok: boolean;
  /** One-line summary for logs. */
  summary: string;
  /** Detailed feedback (compiler/test output) fed back to opencode on failure. */
  feedback: string;
}

/** Context handed to a stack adapter when composing the system prompt. */
export interface StackContext {
  corePrompts: PromptDoc[];
  /** Absolute path to the generated app root. */
  generatedDir: string;
}

/**
 * A stack adapter encodes one target technology (e.g. Python/Flask). It does NOT
 * own the core conventions (those are shared, in @fluxyr/quill-core); it contributes the
 * framework binding (via buildSystemPrompt), the verbatim scaffold, and verify().
 */
export interface StackAdapter {
  name: string;
  /** Files copied verbatim into the generated app (load-bearing, byte-stable). */
  scaffoldTemplates(): FileTemplate[];
  /**
   * Compose the system prompt: the shared core conventions (ctx.corePrompts,
   * passed in by the engine) followed by this stack's framework binding.
   */
  buildSystemPrompt(ctx: StackContext): string;
  /** Compile/lint/test the generated app; returns feedback for the repair loop. */
  verify(generatedDir: string): Promise<VerifyResult>;
}

/** LLM generation settings. Quill calls the provider's API directly. */
export interface LlmConfig {
  /** Provider whose API we call. OpenRouter exposes every model behind one key. */
  provider: "openrouter";
  /** API base URL (default https://openrouter.ai/api/v1). */
  baseUrl?: string;
  /** Max repair passes after the initial generation (default 2). */
  maxRepairPasses: number;
  /** Sampling temperature (default 0 for reproducibility). */
  temperature: number;
  /** Run one self-review pass before verification (the article's doctrine). */
  selfReview: boolean;
}

/** Project configuration persisted as quill.config.json. */
export interface QuillConfig {
  /** Stack adapter name, e.g. "flask". */
  stack: string;
  /** Model slug as "provider/model" (OpenRouter), e.g. "minimax/minimax-m3". */
  model: string;
  paths: {
    /** Prompts root, relative to project. */
    prompts: string;
    /** Generated app root, relative to project. */
    generated: string;
  };
  llm: LlmConfig;
}

/** One applied feature prompt in the ledger. */
export interface AppliedEntry {
  id: string;
  promptHash: string;
  codeHash: string;
  model: string;
  repairPasses: number;
  appliedAt: string;
}

/** A named checkpoint: snapshot + reproducibility verdict. */
export interface CheckpointEntry {
  name: string;
  /** Last applied prompt id at checkpoint time (the "head"). */
  head: string | null;
  /** Snapshot dir relative to project, under .quill/checkpoints/. */
  snapshotDir: string;
  codeHash: string;
  verified: boolean;
  verifiedAt: string;
}

/** The resolved state: quill.lock.json. */
export interface Lockfile {
  version: number;
  stack: string;
  model: string;
  applied: AppliedEntry[];
  checkpoints: CheckpointEntry[];
}

/** A chat message in the generation conversation. */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** One file operation emitted by the model. */
export interface FileOp {
  path: string;
  action: "write" | "delete";
  content?: string;
}
