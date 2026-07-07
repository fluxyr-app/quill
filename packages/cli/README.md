# @fluxyr/quill

The **Quill** CLI — generate and evolve web apps from a stack of framework-agnostic
micro-prompts. Provides the `quill` and `create-quill-app` commands.

```bash
npm install -g @fluxyr/quill
export OPENROUTER_API_KEY=sk-or-...

create-quill-app my-app --stack sinatra   # or flask / node
cd my-app
quill new "create users"
quill up
```

See the [full documentation](https://github.com/fluxyr-app/quill#readme).

## Commands

| Command | What it does |
|---|---|
| `create-quill-app <name> --stack <flask\|node\|sinatra>` | Scaffold a new project |
| `quill new "<title>"` | Create the next feature micro-prompt |
| `quill up` | Apply pending prompts (LLM + repair loop) |
| `quill status` / `quill diff` | Applied vs pending, drift |
| `quill checkpoint <name>` | Snapshot + verify a full regen reproduces the app |
| `quill regen` | Rebuild `generated/` from the prompt stack |
| `quill down <name>` | Roll back to a checkpoint |

MIT © Fluxyr
