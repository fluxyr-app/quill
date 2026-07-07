/**
 * Verification for the Sinatra stack — feeds the repair loop.
 *
 * Stages:
 *   1. Ruby syntax check (`ruby -c`) on every .rb file — hard gate, needs no gems.
 *   2. Tests (`bundle exec rake test`) — runs only when gems are installed
 *      (a `.bundle` config or `vendor/` dir is present); otherwise a soft pass.
 */
import { spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { VerifyResult } from "@quill/core";

interface Run {
  code: number;
  out: string;
}

function run(cmd: string, args: string[], cwd: string): Run {
  const r = spawnSync(cmd, args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    env: process.env,
  });
  const out = `${r.stdout ?? ""}${r.stderr ?? ""}`.trim();
  return { code: r.error ? 127 : r.status ?? 1, out };
}

const SKIP_DIRS = new Set(["vendor", ".bundle", ".git", "node_modules"]);

function rubyFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (cur: string) => {
    if (!fs.existsSync(cur)) return;
    for (const entry of fs.readdirSync(cur, { withFileTypes: true })) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const full = path.join(cur, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.endsWith(".rb")) out.push(full);
    }
  };
  walk(dir);
  return out;
}

export async function verifySinatra(generatedDir: string): Promise<VerifyResult> {
  const ruby = spawnSync("ruby", ["--version"], { encoding: "utf8" });
  if (ruby.error || ruby.status !== 0) {
    return { ok: true, summary: "ruby not found (checks skipped)", feedback: "" };
  }

  // Stage 1 — syntax check every .rb file.
  for (const file of rubyFiles(generatedDir)) {
    const c = run("ruby", ["-c", file], generatedDir);
    if (c.code !== 0) {
      const rel = path.relative(generatedDir, file);
      return {
        ok: false,
        summary: `syntax error in ${rel}`,
        feedback: `Ruby syntax check failed for ${rel}:\n${c.out}`,
      };
    }
  }

  // Stage 2 — tests (only if gems are installed).
  const bundled =
    fs.existsSync(path.join(generatedDir, ".bundle")) ||
    fs.existsSync(path.join(generatedDir, "vendor"));
  if (!bundled) {
    return {
      ok: true,
      summary: "syntax ok; gems not installed (tests skipped)",
      feedback: "",
    };
  }
  const t = run("bundle", ["exec", "rake", "test"], generatedDir);
  if (t.code !== 0) {
    return {
      ok: false,
      summary: "tests failing",
      feedback: `bundle exec rake test failed:\n${t.out}`,
    };
  }
  return { ok: true, summary: "syntax + tests pass", feedback: "" };
}
