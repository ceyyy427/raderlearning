import test from "node:test";
import assert from "node:assert/strict";
import {
  isChangeEventType, isSourceType,
  type ChangeBrief, type ChangeEvent, type LearningTask, type Project, type ReviewCard,
} from "../src/index.ts";

test("project serializes its identity and watch configuration", () => {
  const project: Project = { id: "p1", provider: "github", owner: "acme", repo: "widget", name: "Widget", description: null, defaultBranch: "main", language: "TypeScript", topics: ["sdk"], watchRules: { releases: true, issues: false, pullRequests: true, documentation: true, changelog: true, keywords: ["breaking"] }, status: "watching", lastSyncedAt: "2026-01-01T00:00:00Z" };
  const value = JSON.parse(JSON.stringify(project));
  assert.equal(value.provider, "github"); assert.equal(value.owner, "acme"); assert.equal(value.repo, "widget");
  assert.deepEqual(value.watchRules, project.watchRules); assert.equal(value.status, "watching"); assert.equal(value.lastSyncedAt, project.lastSyncedAt);
});

test("type guards accept exact values only", () => {
  for (const value of ["release", "breaking_change", "deprecation", "security", "api_change", "documentation", "performance", "ecosystem"]) assert.equal(isChangeEventType(value), true);
  assert.equal(isChangeEventType("unknown"), false);
  for (const value of ["github_release", "github_issue", "github_pull_request", "official_documentation", "changelog"]) assert.equal(isSourceType(value), true);
  assert.equal(isSourceType("rss"), false);
});

test("disputed change event preserves conflict state", () => {
  const event: ChangeEvent = { id: "e1", projectId: "p1", eventType: "breaking_change", title: "Conflict", sourceUrl: "https://example.test", supportingSourceIds: [], publishedAt: null, detectedAt: "2026-01-01T00:00:00Z", versionFrom: null, versionTo: null, importance: 0, changeStatus: "disputed", uncertainty: "Sources disagree" };
  const value = JSON.parse(JSON.stringify(event)); assert.equal(value.changeStatus, "disputed"); assert.equal(value.importance, 0); assert.equal(value.publishedAt, null); assert.equal(value.versionFrom, null);
});

test("change brief preserves evidence labels and uncertainty", () => {
  const brief: ChangeBrief = { eventId: "e1", whatChanged: "x", whyItMatters: "y", affectedUsers: [], migrationRequired: null, beforeAfter: [], risks: [], relatedConcepts: [], evidence: [{ sourceId: "s1", kind: "fact", excerpt: "f", url: "u" }, { sourceId: "s2", kind: "explanation", excerpt: "e", url: "u" }, { sourceId: "s3", kind: "inference", excerpt: "i", url: "u" }], generatedAt: "2026-01-01T00:00:00Z", modelVersion: null, status: "uncertain", uncertainty: "needs review" };
  const value = JSON.parse(JSON.stringify(brief)); assert.deepEqual(value.evidence.map((x: { kind: string }) => x.kind), ["fact", "explanation", "inference"]); assert.equal(value.migrationRequired, null); assert.equal(value.uncertainty, "needs review");
});

test("learning task and review card share event linkage", () => {
  const task: LearningTask = { id: "t1", eventId: "e1", taskType: "migration_choice", question: "Choose", starterCode: null, expectedConcept: "migration", solution: "do it", difficulty: "intermediate" };
  const card: ReviewCard = { id: "r1", eventId: "e1", misconceptionCode: null, reviewDueAt: "2026-01-02T00:00:00Z", masteryState: "new", userNote: null };
  assert.equal(task.eventId, card.eventId);
});
