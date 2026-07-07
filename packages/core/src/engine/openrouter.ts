/**
 * OpenRouter client. OpenRouter exposes every model (Anthropic, MiniMax, Qwen,
 * …) behind one OpenAI-compatible chat/completions endpoint and one API key.
 *
 * Responses are streamed (SSE) so callers can show live progress; the full
 * assistant message is still returned once the stream completes.
 */
import { ChatMessage, LlmConfig } from "../types";

const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";

/** Read the OpenRouter API key from the environment, or throw with guidance. */
export function ensureApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error(
      "OPENROUTER_API_KEY is not set. Get a key at https://openrouter.ai/keys and export it:\n" +
        "  export OPENROUTER_API_KEY=sk-or-..."
    );
  }
  return key;
}

export interface ChatParams {
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  temperature: number;
  baseUrl?: string;
  /** Called with each streamed text delta, for live progress. */
  onDelta?: (text: string) => void;
  /**
   * Called with each streamed reasoning delta (reasoning models emit these
   * before any content). Lets the UI show "thinking…" instead of looking frozen.
   */
  onReasoning?: (text: string) => void;
}

export interface ChatUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

export interface ChatResult {
  content: string;
  usage?: ChatUsage;
}

/** One streamed chat completion. Retries transient failures before any output. */
export async function chat(params: ChatParams): Promise<ChatResult> {
  const base = (params.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, "");
  const url = `${base}/chat/completions`;
  const headers = {
    Authorization: `Bearer ${params.apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": "https://github.com/fluxyr/quill",
    "X-Title": "Quill",
  };
  const body = JSON.stringify({
    model: params.model,
    messages: params.messages,
    temperature: params.temperature,
    stream: true,
    stream_options: { include_usage: true },
  });

  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await streamOnce(url, headers, body, params.onDelta, params.onReasoning);
    } catch (err) {
      lastErr = err;
      if (!isTransient(err) || attempt === 2) throw err;
      await sleep(800 * (attempt + 1));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

class TransientError extends Error {}

function isTransient(err: unknown): boolean {
  return err instanceof TransientError;
}

async function streamOnce(
  url: string,
  headers: Record<string, string>,
  body: string,
  onDelta?: (t: string) => void,
  onReasoning?: (t: string) => void
): Promise<ChatResult> {
  const resp = await fetch(url, { method: "POST", headers, body });
  if (!resp.ok || !resp.body) {
    const text = await resp.text().catch(() => "");
    const msg = `OpenRouter ${resp.status}: ${text.slice(0, 800)}`;
    if (resp.status === 429 || resp.status >= 500) throw new TransientError(msg);
    throw new Error(msg);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let content = "";
  let usage: ChatUsage | undefined;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") continue;
      try {
        const json = JSON.parse(data);
        const choiceDelta = json?.choices?.[0]?.delta;
        const delta: string | undefined = choiceDelta?.content;
        if (delta) {
          content += delta;
          onDelta?.(delta);
        }
        // Reasoning models emit `reasoning` deltas before any content.
        const reasoning: string | undefined =
          choiceDelta?.reasoning ?? choiceDelta?.reasoning_content;
        if (reasoning) onReasoning?.(reasoning);
        if (json?.usage) usage = json.usage;
      } catch {
        /* ignore keep-alive / partial lines */
      }
    }
  }

  if (!content) {
    throw new TransientError("OpenRouter returned an empty stream.");
  }
  return { content, usage };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
