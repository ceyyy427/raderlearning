import assert from "node:assert/strict";
import test from "node:test";
import { classifyChange, clusterChanges, deduplicateSources, scoreImportance } from "../src/index.ts";
import type { ChangeEvent, NormalizedSource, Project } from "../src/types.ts";

function source(overrides: Partial<NormalizedSource> = {}): NormalizedSource {
  return {
    id: "s1", projectId: "p1", sourceType: "github_release", providerId: "1", url: "https://github.test/r/1", canonicalUrl: "https://github.test/r/1", fetchedAt: "2026-01-01T00:00:00Z", publishedAt: "2026-01-01T00:00:00Z", contentHash: "h1", rawContent: "raw", versionFrom: "v1.0.0", versionTo: "v2.0.0", status: "ok", error: null, metadata: {}, title: "Widget release v2.0.0", summary: "", content: "", tags: ["release", "version:v2.0.0"], ...overrides,
  };
}

function project(overrides: Partial<Project> = {}): Project {
  return { id: "p1", provider: "github", owner: "acme", repo: "widget", name: "Widget", description: null, defaultBranch: "main", language: "TypeScript", topics: [], watchRules: { releases: true, issues: true, pullRequests: true, documentation: false, changelog: true, keywords: [] }, status: "watching", lastSyncedAt: null, ...overrides };
}

test("deduplicates successful records, retains failed-only attempts, and preserves order", () => {
  const failed = source({ id: "failed", contentHash: null, status: "failed", rawContent: null, error: "timeout", providerId: null, versionFrom: null, versionTo: null });
  const first = source({ id: "first" });
  const duplicate = source({ id: "duplicate" });
  const onlyFailed = source({ id: "only-failed", canonicalUrl: "https://github.test/missing", contentHash: null, status: "failed", rawContent: null, error: "404", providerId: null, versionFrom: null, versionTo: null });
  assert.deepEqual(deduplicateSources([failed, first, duplicate, onlyFailed]).map((record) => record.id), ["first", "only-failed"]);
  assert.deepEqual(deduplicateSources([onlyFailed]).map((record) => record.id), ["only-failed"]);
});

test("release, changelog and PR evidence with a shared version cluster", () => {
  const release = source({ id: "release", sourceType: "github_release", providerId: "10", title: "Widget 2.0.0 release", versionTo: "v2.0.0", contentHash: "r" });
  const changelog = source({ id: "changelog", sourceType: "changelog", providerId: null, title: "Widget 2.0.0 changelog", versionFrom: null, versionTo: null, content: "Changes in v2.0.0", contentHash: "c" });
  const pr = source({ id: "pr", sourceType: "github_pull_request", providerId: "12", title: "Widget 2.0.0 migration", versionFrom: null, versionTo: null, content: "Release v2.0.0", contentHash: "p" });
  const events = clusterChanges([release, changelog, pr]);
  assert.equal(events.length, 1);
  assert.equal(events[0]!.title, release.title);
  assert.deepEqual(events[0]!.supportingSourceIds, ["changelog", "pr"]);
});

test("empty clustering input returns no events", () => assert.deepEqual(clusterChanges([]), []));

test("classification observes marker precedence and failed status", () => {
  assert.equal(classifyChange(source({ title: "Security performance API docs", content: "CVE benchmark endpoint" })).eventType, "security");
  assert.equal(classifyChange(source({ title: "Breaking API change", content: "incompatible parameter" })).eventType, "breaking_change");
  assert.equal(classifyChange(source({ title: "Deprecated API", content: "sunset" })).eventType, "deprecation");
  assert.equal(classifyChange(source({ title: "API endpoint", content: "schema" })).eventType, "api_change");
  assert.equal(classifyChange(source({ title: "Faster throughput", content: "benchmark" })).eventType, "performance");
  assert.equal(classifyChange(source({ sourceType: "official_documentation", title: "Guide", content: "reference" })).eventType, "documentation");
  assert.equal(classifyChange(source({ sourceType: "official_documentation", title: "Plugin migration guide", content: "plugin integration" })).eventType, "documentation");
  assert.equal(classifyChange(source({ title: "Plugin integration", content: "ecosystem" })).eventType, "ecosystem");
  assert.equal(classifyChange(source({ status: "failed", contentHash: null, rawContent: null, error: "down" })).changeStatus, "failed");
});

test("migration evidence is limited to breaking, deprecation and API changes", () => {
  assert.equal(classifyChange(source({ title: "Breaking change", content: "migration required" })).migrationRequired, true);
  assert.equal(classifyChange(source({ title: "Deprecated API", content: "sunset", versionFrom: "v1.0.0", versionTo: "v1.1.0" })).migrationRequired, false);
  assert.equal(classifyChange(source({ title: "API v1 to v2", versionFrom: "v1.0.0", versionTo: "v2.0.0" })).migrationRequired, true);
  assert.equal(classifyChange(source({ title: "Security fix", content: "CVE" })).migrationRequired, false);
});

test("conflicting evidence is disputed and event IDs are stable", () => {
  const release = source({ id: "r", title: "Widget v2.0.0", versionTo: "v2.0.0", contentHash: "r" });
  const security = source({ id: "s", sourceType: "github_issue", providerId: "10", title: "Widget v2.0.0 security", versionTo: "v3.0.0", content: "CVE", contentHash: "s" });
  const first = clusterChanges([release, security]);
  const second = clusterChanges([release, security]);
  assert.equal(first[0]!.changeStatus, "disputed");
  assert.equal(first[0]!.eventType, "security");
  assert.match(first[0]!.uncertainty!, /r|s/);
  assert.equal(first[0]!.id, second[0]!.id);
  assert.notEqual(first[0]!.id, clusterChanges([source({ id: "other", title: "Other release", versionTo: "v9.0.0" })])[0]!.id);
});

test("importance applies priorities, bonuses, clamp and documentation penalty", () => {
  const base: ChangeEvent = { id: "e", projectId: "p1", eventType: "security", title: "Fix auth", sourceUrl: "https://x/auth", supportingSourceIds: ["a", "b", "c", "d", "e", "f"], publishedAt: null, detectedAt: "2026-01-01T00:00:00Z", versionFrom: "v1", versionTo: "v2", importance: 0, changeStatus: "new", uncertainty: null };
  assert.equal(scoreImportance(base, project({ watchRules: { ...project().watchRules, keywords: ["auth"] } })), 100);
  const docs = { ...base, eventType: "documentation" as const, supportingSourceIds: [], title: "Guide", versionFrom: null, versionTo: null };
  assert.equal(scoreImportance(docs, project()), 25);
  assert.equal(scoreImportance(docs, project({ watchRules: { ...project().watchRules, documentation: true, keywords: ["guide"] } })), 40);
});
