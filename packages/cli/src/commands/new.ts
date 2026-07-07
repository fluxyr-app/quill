/** `quill new "<title>"` — create the next feature micro-prompt. */
import * as fs from "fs";
import * as path from "path";
import { renderPromptFile } from "@quill/core";
import { loadProject, log, nextFeatureId, relFromRoot } from "../util";

export function cmdNew(title: string): void {
  const { root, paths } = loadProject();
  fs.mkdirSync(paths.featurePrompts, { recursive: true });
  const id = nextFeatureId(paths.featurePrompts, title);
  const file = path.join(paths.featurePrompts, `${id}.md`);

  const body = [
    `${title}.`,
    "",
    "<!-- Describe the feature as a spec. For example: -->",
    "<!-- - Models/tables and their fields + relationships. -->",
    "<!-- - REST routes (account-scoped, using the <sid:...> short-id convention). -->",
    "<!-- - Any validation or business rules. -->",
    "<!-- Follow the project conventions in prompts/core/. -->",
  ].join("\n");

  fs.writeFileSync(
    file,
    renderPromptFile({ id, kind: "feature", dependsOn: [], body })
  );

  log(`✓ created ${relFromRoot(root, file)}`);
  log(`  edit the spec, then run:  quill up`);
}
