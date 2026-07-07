#!/usr/bin/env node
/** `create-quill-app` — scaffold a new Quill project. */
import * as fs from "fs";
import * as path from "path";
import { Command } from "commander";
import "@fluxyr/quill-stack-flask"; // registers the flask stack
import "@fluxyr/quill-stack-node"; // registers the node stack
import "@fluxyr/quill-stack-sinatra"; // registers the sinatra stack
import {
  getStack,
  listStacks,
  defaultConfig,
  writeConfig,
  resolvePaths,
  emptyLockfile,
  writeLockfile,
  scaffoldGenerated,
} from "@fluxyr/quill-core";
import { log, die } from "./util";

const PROJECT_GITIGNORE = [
  "# Python",
  "__pycache__/",
  "*.pyc",
  ".venv/",
  "venv/",
  "*.sqlite3",
  "instance/",
  ".pytest_cache/",
  ".ruff_cache/",
  "",
  "# Node",
  "node_modules/",
  "dist/",
  "",
  "# Ruby",
  "vendor/",
  ".bundle/",
  "",
].join("\n");

function projectReadme(name: string, stack: string): string {
  return [
    `# ${name}`,
    "",
    "A [Quill](https://fluxyr.com/en/research/ephemeral-code-generation) project:",
    "this app is defined as an ordered stack of **micro-prompts**, not maintained",
    "source. Code under `generated/` is a derived artifact — edit the prompts, not",
    "the code, and let `quill up` (which drives an LLM via OpenRouter) regenerate it.",
    "",
    `- **Stack:** ${stack}`,
    "- **Feature prompts** (`prompts/*.md`) are this project's micro-prompts, applied",
    "  in order like migrations. (The shared, framework-agnostic conventions live in",
    "  Quill itself, not in this project.)",
    "- **`quill.lock.json`** is the resolved-state ledger.",
    "",
    "## Commands",
    "```",
    'quill new "add projects"   # create the next feature micro-prompt',
    "quill up                   # apply pending prompts via opencode (+ repair loop)",
    "quill status               # applied vs pending, and drift",
    "quill checkpoint v1        # snapshot + verify a full regen reproduces the app",
    "quill regen                # rebuild generated/ from the whole prompt stack",
    "quill down v1              # roll back to a checkpoint",
    "```",
    "",
    "## Running the generated app",
    "```",
    "cd generated",
    "python3 -m venv .venv && . .venv/bin/activate",
    "pip install -r requirements.txt",
    "pytest -q",
    "FLASK_APP=wsgi flask run",
    "```",
    "",
  ].join("\n");
}

const program = new Command();
program
  .name("create-quill-app")
  .argument("<name>", "project directory to create")
  .option("--stack <stack>", "stack adapter", "flask")
  .option("--model <model>", "opencode model as provider/model", "")
  .action((name: string, opts: { stack: string; model: string }) => {
    const root = path.resolve(process.cwd(), name);
    if (fs.existsSync(root) && fs.readdirSync(root).length > 0) {
      die(`target directory '${name}' already exists and is not empty.`);
    }

    let stack;
    try {
      stack = getStack(opts.stack);
    } catch {
      die(`unknown stack '${opts.stack}'. Available: ${listStacks().join(", ")}`);
    }

    const config = defaultConfig(opts.stack, opts.model);
    const paths = resolvePaths(root, config);

    // A project owns only its feature prompts. Core prompts (the shared,
    // framework-agnostic conventions) live in the stack package and are read from
    // there — they are not copied into the project.
    for (const d of [root, paths.featurePrompts, paths.checkpoints]) {
      fs.mkdirSync(d, { recursive: true });
    }

    writeConfig(root, config);
    writeLockfile(root, emptyLockfile(opts.stack, config.model));

    // Scaffold the generated app (verbatim, load-bearing templates).
    scaffoldGenerated({ stack: stack!, generatedDir: paths.generated });

    fs.writeFileSync(path.join(root, ".gitignore"), PROJECT_GITIGNORE);
    fs.writeFileSync(path.join(root, "README.md"), projectReadme(name, opts.stack));

    log(`\n✓ Created Quill project '${name}' (stack: ${opts.stack}, model: ${config.model})\n`);
    log("Next steps:");
    log(`  cd ${name}`);
    log(`  export OPENROUTER_API_KEY=sk-or-...   # get one at https://openrouter.ai/keys`);
    log(`  quill new "create users"     # add a feature micro-prompt`);
    log(`  quill up                     # generate/evolve the app via OpenRouter`);
    log(`  quill status                 # applied vs pending, drift\n`);
  });

program.parse();
