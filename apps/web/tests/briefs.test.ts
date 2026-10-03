import assert from "node:assert/strict";
import test from "node:test";
import { createLearningTask, generateChangeBrief } from "@aihot/developer-domain";

test("brief view data preserves order, uncertainty and a safe task", async () => {
  const event = { id: "e", projectId: "p", eventType: "breaking_change" as const, title: "API migration", sourceUrl: "https://example.test", supportingSourceIds: [], publishedAt: null, detectedAt: "2026-01-01T00:00:00Z", versionFrom: "v1", versionTo: "v2", importance: 90, changeStatus: "new" as const, uncertainty: null };
  const source = { id: "s", projectId: "p", sourceType: "github_release" as const, providerId: "1", url: "https://example.test", canonicalUrl: "https://example.test", fetchedAt: "2026-01-01T00:00:00Z", publishedAt: null, contentHash: "h", rawContent: "migration", versionFrom: "v1", versionTo: "v2", status: "ok" as const, error: null, metadata: {} };
  const brief = await generateChangeBrief(event, [source]);
  assert.equal(brief.status, "ready"); assert.equal(brief.migrationRequired, true);
  const task = createLearningTask(brief); assert.equal(task.taskType, "migration_choice"); assert.equal(task.starterCode, null);
});

