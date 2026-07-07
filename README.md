# Quill

**Generate and evolve web apps from a stack of micro-prompts.**

Quill treats a web app as an ordered stack of framework-agnostic **micro-prompts**
(the durable asset), not hand-maintained source. Code is a *derived artifact*:
Quill drives an LLM (via [OpenRouter](https://openrouter.ai)) to generate it, runs
a self-review + verify **repair loop**, and records a resolved-state ledger — so the
app can be regenerated, checkpointed, and reproduced on demand. It follows the
["ephemeral code generation"](https://fluxyr.com/en/research/ephemeral-code-generation)
thesis: *the specification is the asset; the code is disposable.*

## How it works

- **Core conventions** (`@fluxyr/quill-core`) — a single shared, **language-agnostic**
  spec of how an app behaves: identifiers (Base-62 short IDs), resources, endpoints,
  authorization, errors. Owned by Quill, reused by every stack.
- **Stacks** — a stack maps those conventions to one framework. Each ships a
  `binding.md` (the framework realization), a minimal scaffold, and a `verify()`
  (compile/lint/test). Available: **Flask** (Python), **Express** (Node/TS),
  **Sinatra** (Ruby).
- **Feature prompts** — your project's micro-prompts, applied in order like migrations.
- **The engine** — for each prompt: compose the system prompt → LLM emits whole-file
  edits → apply → one self-review pass → `verify()` → feed failures back (repair loop)
  → record prompt+code hashes in `quill.lock.json`.

The same core conventions produce a Python/Flask, a TypeScript/Express, and a
Ruby/Sinatra app with identical behavior and an identical short-ID wire format.

## Quick start

```bash
npm install -g @fluxyr/quill          # installs the `quill` and `create-quill-app` commands
export OPENROUTER_API_KEY=sk-or-...    # from https://openrouter.ai/keys

create-quill-app my-app --stack sinatra   # or flask / node
cd my-app
quill new "create users"               # add a feature micro-prompt (edit the spec)
quill up                               # generate/evolve the app via the LLM + repair loop
```

## CLI

| Command | What it does |
|---|---|
| `create-quill-app <name> --stack <flask\|node\|sinatra>` | Scaffold a new project |
| `quill new "<title>"` | Create the next feature micro-prompt |
| `quill up` | Apply pending prompts (LLM + repair loop) |
| `quill status` / `quill diff` | Applied vs pending, drift |
| `quill checkpoint <name>` | Snapshot + verify a full regen reproduces the app |
| `quill regen` | Rebuild `generated/` from the whole prompt stack |
| `quill down <name>` | Roll back to a checkpoint |

Set the model in `quill.config.json` (any OpenRouter slug, e.g. `minimax/minimax-m3`,
`anthropic/claude-haiku-4.5`). Per the research, a cheap model + one self-review pass
matches frontier correctness at a fraction of the cost.

## Packages

| Package | Purpose |
|---|---|
| [`@fluxyr/quill`](packages/cli) | CLI — `quill` + `create-quill-app` |
| [`@fluxyr/quill-core`](packages/core) | Engine: shared conventions, ledger, OpenRouter engine, repair loop |
| [`@fluxyr/quill-stack-flask`](packages/stack-flask) | Python / Flask stack |
| [`@fluxyr/quill-stack-node`](packages/stack-node) | Node / TypeScript / Express stack |
| [`@fluxyr/quill-stack-sinatra`](packages/stack-sinatra) | Ruby / Sinatra stack |

## Development

```bash
npm install
npm run build
npm link --workspace @fluxyr/quill    # expose `quill` / `create-quill-app` from your checkout
```

## License

MIT © Fluxyr
