import assert from "node:assert/strict";
import test from "node:test";
import { createLearningTask, generateChangeBrief } from "../src/index.ts";
import type { ChangeEvent, SourceRecord } from "../src/types.ts";

const event: ChangeEvent = { id: "e1", projectId: "p1", eventType: "breaking_change", title: "API v2 migration", sourceUrl: "https://example.test/release", supportingSourceIds: ["s2"], publishedAt: null, detectedAt: "2026-01-01T00:00:00Z", versionFrom: "v1", versionTo: "v2", importance: 90, changeStatus: "new", uncertainty: null };
function source(id: string, overrides: Partial<SourceRecord> = {}): SourceRecord { return { id, projectId: "p1", sourceType: "github_release", providerId: id, url: `https://example.test/${id}`, canonicalUrl: `https://example.test/${id}`, fetchedAt: "2026-01-01T00:00:00Z", publishedAt: null, contentHash: id, rawContent: `Release ${id} migration`, versionFrom: "v1", versionTo: "v2", status: "ok", error: null, metadata: { title: "API v2 migration" }, ...overrides }; }

test("brief keeps source facts, evidence labels, metadata examples and migration task", async () => {
  const brief = await generateChangeBrief(event, [source("s1", { metadata: { title: "API v2 migration", before: "old()", after: "new()", language: "ts", relatedConcepts: ["API contract"] } })]);
  assert.equal(brief.status, "ready"); assert.equal(brief.whatChanged, event.title); assert.equal(brief.migrationRequired, true);
  assert.deepEqual(brief.beforeAfter[0]?.sourceIds, ["s1"]); assert.equal(brief.evidence.some((item) => item.kind === "explanation"), true);
  const task = createLearningTask(brief); assert.equal(task.taskType, "migration_choice"); assert.equal(task.starterCode, null); assert.equal(task.eventId, event.id);
});
test("missing or failed evidence cannot produce a confident brief", async () => {
  const brief = await generateChangeBrief({ ...event, changeStatus: "disputed", uncertainty: "version conflict" }, [source("failed", { status: "failed", rawContent: null, error: "timeout" })]);
  assert.equal(brief.status, "failed"); assert.equal(brief.migrationRequired, null); assert.match(brief.uncertainty ?? "", /No usable/);
});

