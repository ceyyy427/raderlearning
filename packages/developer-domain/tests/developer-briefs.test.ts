import assert from "node:assert/strict";
import test from "node:test";
import { createLearningTask, generateChangeBrief } from "../src/index.ts";
import type { ChangeEvent, SourceRecord } from "../src/types.ts";

const event = (overrides: Partial<ChangeEvent> = {}): ChangeEvent => ({
  id: "event-1", projectId: "project-1", eventType: "breaking_change", title: "Widget breaking change",
  sourceUrl: "https://example.test/change", supportingSourceIds: ["source-1"], publishedAt: null,
  detectedAt: "2026-01-01T00:00:00.000Z", versionFrom: null, versionTo: null, importance: 80,
  changeStatus: "new", uncertainty: null, ...overrides,
});
const source = (overrides: Partial<SourceRecord> = {}): SourceRecord => ({
  id: "source-1", projectId: "project-1", sourceType: "github_release", providerId: "1",
  url: "https://example.test/change", canonicalUrl: "https://example.test/change", fetchedAt: "2026-01-01T00:00:00.000Z",
  publishedAt: null, contentHash: "hash", rawContent: "The old endpoint is removed; migrate to the new endpoint.",
  versionFrom: "v1", versionTo: "v2", status: "ok", error: null,
  metadata: { affectedUsers: ["API consumers"], before: "old()", after: "new()", language: "ts", relatedConcepts: ["API migration"] }, ...overrides,
});

test("brief is deterministic, source-backed, and caps evidence excerpts", async () => {
  const brief = await generateChangeBrief(event(), [source({ rawContent: "x".repeat(2000) })]);
  assert.equal(brief.status, "ready");
  assert.match(brief.whatChanged, /Widget breaking change/);
  assert.equal(brief.evidence[0]?.kind, "fact");
  assert.equal(brief.evidence[0]?.sourceId, "source-1");
  assert.ok((brief.evidence[0]?.excerpt.length ?? 0) <= 1000);
  assert.deepEqual(brief.affectedUsers, ["API consumers"]);
  assert.equal(brief.migrationRequired, true);
  assert.deepEqual(brief.beforeAfter[0], { before: "old()", after: "new()", language: "ts", sourceIds: ["source-1"] });
  assert.equal(brief.modelVersion, null);
  assert.equal(brief.evidence.at(-1)?.kind, "explanation");
});

test("failed-only and disputed evidence stay uncertain without invented facts", async () => {
  const failed = source({ status: "failed", rawContent: null, url: "", error: "timeout" });
  const unavailable = await generateChangeBrief(event(), [failed]);
  assert.equal(unavailable.status, "failed");
  assert.equal(unavailable.whatChanged, "");
  assert.deepEqual(unavailable.evidence, []);
  const disputed = await generateChangeBrief(event({ changeStatus: "disputed", uncertainty: "versions disagree" }), [source({ versionFrom: null, versionTo: null, rawContent: "release notes" })]);
  assert.equal(disputed.status, "uncertain");
  assert.equal(disputed.migrationRequired, null);
  assert.equal(disputed.uncertainty, "versions disagree");
});

test("learning task is safe, deterministic, and points to evidence", async () => {
  const brief = await generateChangeBrief(event(), [source()]);
  const first = createLearningTask(brief);
  const second = createLearningTask(brief);
  assert.deepEqual(first, second);
  assert.equal(first.taskType, "migration_choice");
  assert.equal(first.starterCode, null);
  assert.match(first.solution, /retained evidence/);
  assert.match(first.id, /^learning-[0-9a-f]{32}$/);
});
