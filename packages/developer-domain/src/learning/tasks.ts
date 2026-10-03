import { createHash } from "node:crypto";
import type { ChangeBrief, LearningTask } from "../types.ts";

/** Create a deterministic, non-executable learning prompt from a source-backed brief. */
export function createLearningTask(brief: ChangeBrief): LearningTask {
  const migration = brief.migrationRequired === true;
  const hasBeforeAfter = brief.beforeAfter.length > 0;
  const taskType: LearningTask["taskType"] = migration ? "migration_choice" : hasBeforeAfter ? "diff_judgement" : "code_reading";
  const difficulty: LearningTask["difficulty"] = migration || hasBeforeAfter ? "intermediate" : "beginner";
  const concept = brief.relatedConcepts[0] ?? (migration ? "migration review" : "evidence review");
  const evidenceHint = brief.evidence.filter((item) => item.kind === "fact")[0];
  const evidenceText = evidenceHint ? ` Review the evidence at ${evidenceHint.url}.` : " Review the retained evidence before deciding.";
  let question: string;
  if (migration) question = `What migration step would you verify for “${brief.whatChanged || "this change"}” before upgrading?${evidenceText}`;
  else if (hasBeforeAfter) question = `Which behavior differs between the retained before and after examples for “${brief.whatChanged || "this change"}”?${evidenceText}`;
  else question = `What can you verify from the retained evidence about “${brief.whatChanged || "this change"}”?${evidenceText}`;
  const solution = `Use the brief’s ${concept} context and cite the retained evidence. Do not assume a code change that the sources do not show.${evidenceText}`;
  const id = `learning-${createHash("sha256").update(brief.eventId, "utf8").digest("hex").slice(0, 32)}`;
  return { id, eventId: brief.eventId, taskType, question, starterCode: null, expectedConcept: concept, solution, difficulty };
}
