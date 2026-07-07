/**
 * Verification for the Node stack — feeds the repair loop.
 *
 * Stages:
 *   1. TypeScript typecheck (`tsc --noEmit`) — hard gate.
 *   2. Test runner (`node --import tsx --test tests/*.test.ts`).
 *
 * Both require the app's dev dependencies (typescript, tsx, supertest, …) to be
 * installed. If node_modules is missing, the stages are skipped (soft pass) so the
 * repair loop never fights a missing-deps condition. Run `npm install` in the
 * generated app for full checks.
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

export async function verifyNode(generatedDir: string): Promise<VerifyResult> {
  const tscBin = path.join(
    generatedDir,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "tsc.cmd" : "tsc"
  );
  if (!fs.existsSync(tscBin)) {
    return {
      ok: true,
      summary: "deps not installed (typecheck/tests skipped)",
      feedback: "",
    };
  }

  // Stage 1 — typecheck.
  const tc = run(tscBin, ["--noEmit"], generatedDir);
  if (tc.code !== 0) {
    return {
      ok: false,
      summary: "typecheck failed",
      feedback: `tsc --noEmit failed:\n${tc.out}`,
    };
  }

  // Stage 2 — tests.
  const testsDir = path.join(generatedDir, "tests");
  const testFiles = fs.existsSync(testsDir)
    ? fs
        .readdirSync(testsDir)
        .filter((f) => f.endsWith(".test.ts"))
        .map((f) => path.join("tests", f))
    : [];
  if (testFiles.length === 0) {
    return { ok: true, summary: "typecheck ok; no tests found", feedback: "" };
  }
  const t = run("node", ["--import", "tsx", "--test", ...testFiles], generatedDir);
  if (t.code !== 0) {
    return {
      ok: false,
      summary: "tests failing",
      feedback: `node --test failed:\n${t.out}`,
    };
  }
  return { ok: true, summary: "typecheck + tests pass", feedback: "" };
}
