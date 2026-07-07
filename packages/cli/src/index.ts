#!/usr/bin/env node
/** `quill` — the Quill CLI. */
import { Command } from "commander";
import "@quill/stack-flask"; // registers the flask stack
import "@quill/stack-node"; // registers the node stack
import "@quill/stack-sinatra"; // registers the sinatra stack
import { die } from "./util";
import { cmdNew } from "./commands/new";
import { cmdUp } from "./commands/up";
import { cmdStatus } from "./commands/status";
import { cmdCheckpoint } from "./commands/checkpoint";
import { cmdDown } from "./commands/down";
import { cmdRegen } from "./commands/regen";
import { cmdDiff } from "./commands/diff";

async function main() {
  const program = new Command();
  program
    .name("quill")
    .description(
      "Quill — generate and evolve a web app from a stack of micro-prompts (via opencode)."
    )
    .version("0.1.0");

  program
    .command("new")
    .argument("<title>", "short title for the feature")
    .description("create the next feature micro-prompt")
    .action((title: string) => cmdNew(title));

  program
    .command("up")
    .description("apply pending feature prompts via opencode (with repair loop)")
    .option("-m, --model <model>", "override the model for this run (provider/model)")
    .action((opts) => cmdUp(opts));

  program
    .command("status")
    .description("show applied vs pending prompts and drift")
    .action(() => cmdStatus());

  program
    .command("diff")
    .description("show what 'quill up' would change (pending & edited prompts)")
    .action(() => cmdDiff());

  program
    .command("checkpoint")
    .argument("<name>", "checkpoint name")
    .description("snapshot generated/ and verify a full regen reproduces it")
    .action((name: string) => cmdCheckpoint(name));

  program
    .command("regen")
    .description("rebuild generated/ from the whole prompt stack")
    .option("--from <checkpoint>", "regen only up to a checkpoint's head")
    .action((opts) => cmdRegen(opts));

  program
    .command("down")
    .argument("<name>", "checkpoint name to restore")
    .description("restore generated/ to a checkpoint and truncate the ledger")
    .action((name: string) => cmdDown(name));

  await program.parseAsync(process.argv);
}

main().catch((err) => die(err instanceof Error ? err.message : String(err)));
