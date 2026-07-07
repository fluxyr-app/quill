/**
 * Verification for the Flask stack — feeds the repair loop.
 *
 * Stages, in order:
 *   1. Syntax check (compileall) — always runs; hard gate.
 *   2. Import / app-factory smoke — runs if Flask is importable.
 *   3. pytest — runs if Flask + pytest are importable.
 *
 * When the app's dependencies are not installed, stages 2-3 are skipped (a soft
 * pass) rather than reported as failures, so the repair loop never fights a
 * missing-deps condition. Install deps (see requirements.txt) for full checks.
 */
import { spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { VerifyResult } from "@fluxyr/quill-core";

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

/** Candidate interpreters, most specific first. */
function interpreters(generatedDir: string): string[] {
  const c: string[] = [];
  if (process.env.QUILL_PY) c.push(process.env.QUILL_PY);
  const venv = path.join(generatedDir, ".venv", "bin", "python");
  if (fs.existsSync(venv)) c.push(venv);
  c.push("python3", "python");
  return c;
}

/** Find an interpreter that can `import flask`, or null. */
function pyWithFlask(generatedDir: string): string | null {
  for (const py of interpreters(generatedDir)) {
    const r = run(py, ["-c", "import flask"], generatedDir);
    if (r.code === 0) return py;
  }
  return null;
}

function anyPython(generatedDir: string): string | null {
  for (const py of interpreters(generatedDir)) {
    const r = run(py, ["--version"], generatedDir);
    if (r.code === 0) return py;
  }
  return null;
}

export async function verifyFlask(generatedDir: string): Promise<VerifyResult> {
  const basePy = anyPython(generatedDir);
  if (!basePy) {
    return {
      ok: false,
      summary: "no python interpreter found",
      feedback: "No python3 interpreter is available to verify the app.",
    };
  }

  // Stage 1 — syntax.
  const targets = ["app", "tests", "wsgi.py", "config.py"].filter((t) =>
    fs.existsSync(path.join(generatedDir, t))
  );
  const compile = run(basePy, ["-m", "compileall", "-q", ...targets], generatedDir);
  if (compile.code !== 0) {
    return {
      ok: false,
      summary: "syntax error",
      feedback: `Syntax check failed (compileall):\n${compile.out}`,
    };
  }

  // Stages 2-3 require Flask.
  const py = pyWithFlask(generatedDir);
  if (!py) {
    return {
      ok: true,
      summary: "syntax ok; deps not installed (import/tests skipped)",
      feedback: "",
    };
  }

  // Stage 2 — import / app factory smoke.
  const smoke = run(
    py,
    ["-c", "import app; a = app.create_app(); print('factory ok')"],
    generatedDir
  );
  if (smoke.code !== 0) {
    return {
      ok: false,
      summary: "import/app-factory error",
      feedback: `The app failed to import / build via create_app():\n${smoke.out}`,
    };
  }

  // Stage 3 — pytest.
  const hasTests =
    fs.existsSync(path.join(generatedDir, "tests")) &&
    fs
      .readdirSync(path.join(generatedDir, "tests"))
      .some((f) => f.startsWith("test_") && f.endsWith(".py"));
  if (!hasTests) {
    return { ok: true, summary: "factory ok; no tests found", feedback: "" };
  }
  const pytest = run(py, ["-m", "pytest", "-q"], generatedDir);
  if (pytest.code !== 0) {
    return {
      ok: false,
      summary: "pytest failing",
      feedback: `pytest failed:\n${pytest.out}`,
    };
  }
  return { ok: true, summary: "syntax + factory + pytest pass", feedback: "" };
}
