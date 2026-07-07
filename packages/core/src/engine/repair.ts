/**
 * The repair loop — the ephemeral-code-generation doctrine: one self-review
 * pass, then verify-and-feed-back until the stack's verify() passes or the pass
 * budget is exhausted. Runs within a single GenSession so the model keeps
 * context across turns.
 */
import { LlmConfig, StackAdapter } from "../types";
import { GenSession } from "./session";

export interface RepairParams {
  session: GenSession;
  generatedDir: string;
  llm: LlmConfig;
  stack: StackAdapter;
  log: (msg: string) => void;
}

export interface RepairResult {
  passes: number;
  verified: boolean;
  detail: string;
}

const SELF_REVIEW_MESSAGE =
  "Review your changes against the feature spec and the project conventions. " +
  "Fix any bugs, missing routes/fields, or convention violations. If everything " +
  "is already correct and complete, reply with an empty files array. " +
  "Respond using the output protocol.";

function feedbackMessage(feedback: string): string {
  return (
    "The generated app failed verification. Fix the issues below, then stop. " +
    "Keep changes minimal and consistent with the conventions. Respond using the " +
    "output protocol with the full contents of every file you change.\n\n" +
    "```\n" +
    feedback.slice(0, 8000) +
    "\n```"
  );
}

export async function repairLoop(params: RepairParams): Promise<RepairResult> {
  const { session, generatedDir, llm, stack, log } = params;
  let passes = 0;

  if (llm.selfReview) {
    log("  ↻ self-review pass");
    await session.send(SELF_REVIEW_MESSAGE);
    passes++;
  }

  let v = await stack.verify(generatedDir);
  log(`  ✓ verify: ${v.summary}`);
  let attempt = 0;
  while (!v.ok && attempt < llm.maxRepairPasses) {
    log(`  ↻ repair pass ${attempt + 1}/${llm.maxRepairPasses}`);
    await session.send(feedbackMessage(v.feedback));
    passes++;
    attempt++;
    v = await stack.verify(generatedDir);
    log(`  ✓ verify: ${v.summary}`);
  }

  return { passes, verified: v.ok, detail: v.ok ? v.summary : v.feedback };
}
