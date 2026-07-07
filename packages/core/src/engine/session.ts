/**
 * A generation session: a running chat conversation whose assistant replies are
 * parsed as file-ops and applied to the generated app. One session spans a
 * feature's initial generation plus its repair passes, so the model keeps full
 * context across the loop. Streamed output drives live progress.
 */
import { ChatMessage, LlmConfig } from "../types";
import { chat } from "./openrouter";
import { applyFileOps, parseFileOps } from "./fileops";

export interface GenSessionOptions {
  apiKey: string;
  model: string;
  system: string;
  generatedDir: string;
  llm: LlmConfig;
  log: (msg: string) => void;
}

export class GenSession {
  private messages: ChatMessage[];
  constructor(private opts: GenSessionOptions) {
    this.messages = [{ role: "system", content: opts.system }];
  }

  /** Send a user turn; stream + apply the resulting file-ops. */
  async send(userText: string): Promise<{ applied: number; notes?: string }> {
    this.messages.push({ role: "user", content: userText });

    // Live progress: print a heartbeat as tokens stream in.
    const start = Date.now();
    let chars = 0;
    let lastAt = start;
    let lastChars = 0;
    this.opts.log(`  → ${this.opts.model} …`);
    const onDelta = (t: string) => {
      chars += t.length;
      const now = Date.now();
      if (chars - lastChars >= 1200 || now - lastAt >= 3000) {
        this.opts.log(
          `    … receiving (${chars} chars, ${Math.round((now - start) / 1000)}s)`
        );
        lastAt = now;
        lastChars = chars;
      }
    };

    // Reasoning models (e.g. minimax-m3) stream a thinking phase before any
    // content — surface it so the run never looks frozen.
    let reasonChars = 0;
    let reasonLastAt = start;
    const onReasoning = (t: string) => {
      reasonChars += t.length;
      const now = Date.now();
      if (now - reasonLastAt >= 3000) {
        this.opts.log(
          `    … thinking (${reasonChars} chars, ${Math.round((now - start) / 1000)}s)`
        );
        reasonLastAt = now;
      }
    };

    const { content, usage } = await chat({
      apiKey: this.opts.apiKey,
      model: this.opts.model,
      messages: this.messages,
      temperature: this.opts.llm.temperature,
      baseUrl: this.opts.llm.baseUrl,
      onDelta,
      onReasoning,
    });
    this.messages.push({ role: "assistant", content });

    const { ops, notes } = parseFileOps(content);
    if (ops.length === 0) {
      this.opts.log(
        "  ! model returned no file operations" +
          (content.trim() ? ` (reply: ${content.trim().slice(0, 120)}…)` : "")
      );
    }
    const applied = applyFileOps(this.opts.generatedDir, ops);
    const secs = Math.round((Date.now() - start) / 1000);
    const tok = usage?.total_tokens ? `, ${usage.total_tokens} tok` : "";
    this.opts.log(
      `  · ${applied} file(s) written (${secs}s${tok})${notes ? ` — ${notes}` : ""}`
    );
    return { applied, notes };
  }
}
