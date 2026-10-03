import "../setup.ts";
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { buildApp } from "../../apps/api/src/app.ts";
import { closeDb, sql } from "@aihot/backend/db";
import { clusterChanges, deduplicateSources, type NormalizedSource } from "@aihot/developer-domain";

const app = await buildApp();
const tag = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const owner = `fixture-${tag}`;
const repo = "learning-radar";
const projectId = `github:${owner}/${repo}`;
const now = "2026-01-01T00:00:00.000Z";

function source(input: Partial<NormalizedSource> & Pick<NormalizedSource, "id" | "sourceType" | "url" | "title">): NormalizedSource {
  return {
    id: input.id, projectId, sourceType: input.sourceType, providerId: input.providerId ?? null,
    url: input.url, canonicalUrl: input.canonicalUrl ?? input.url, fetchedAt: input.fetchedAt ?? now,
    publishedAt: input.publishedAt ?? now, contentHash: input.contentHash ?? input.id,
    rawContent: input.rawContent ?? input.content ?? input.title, versionFrom: input.versionFrom ?? "1.0.0",
    versionTo: input.versionTo ?? "2.0.0", status: input.status ?? "ok", error: input.error ?? null,
    metadata: input.metadata ?? { title: input.title, excerpt: input.content ?? input.title, relatedConcepts: ["release practice"] },
    title: input.title, summary: input.summary ?? input.title, content: input.content ?? input.title, tags: input.tags ?? ["version:2.0.0"],
  };
}

async function insertFixture(event: ReturnType<typeof clusterChanges>[number], records: NormalizedSource[]) {
  for (const record of records) {
    await sql`
      INSERT INTO developer_source_snapshots
        (id, project_id, source_type, provider_id, url, canonical_url, fetched_at, published_at, content_hash, raw_content,
         version_from, version_to, status, error, metadata)
      VALUES
        (${record.id}, ${projectId}, ${record.sourceType}, ${record.providerId}, ${record.url}, ${record.canonicalUrl},
         ${record.fetchedAt}, ${record.publishedAt}, ${record.contentHash}, ${record.rawContent}, ${record.versionFrom},
         ${record.versionTo}, ${record.status}, ${record.error}, ${sql.json(record.metadata as never)})
    `;
  }
  await sql`
    INSERT INTO developer_change_events
      (id, project_id, event_type, title, source_url, supporting_source_ids, published_at, detected_at, version_from, version_to, importance, change_status, uncertainty)
    VALUES
      (${event.id}, ${projectId}, ${event.eventType}, ${event.title}, ${event.sourceUrl}, ${event.supportingSourceIds},
       ${event.publishedAt}, ${event.detectedAt}, ${event.versionFrom}, ${event.versionTo}, 92, ${event.changeStatus}, ${event.uncertainty})
  `;
}

after(async () => {
  await sql`DELETE FROM developer_projects WHERE id = ${projectId}`;
  await app.close();
  await closeDb();
});

test("complete local radar learning flow is source-backed and idempotent", async () => {
  const created = await app.inject({ method: "POST", url: "/api/projects", payload: { owner, repo, name: "Learning Radar fixture" } });
  assert.equal(created.statusCode, 201);
  assert.equal(created.json().id, projectId);
  const repeated = await app.inject({ method: "POST", url: "/api/projects", payload: { owner, repo } });
  assert.equal(repeated.statusCode, 201);
  assert.equal(repeated.json().name, "Learning Radar fixture");

  const release = source({ id: `${tag}-release`, sourceType: "github_release", providerId: "release-2", url: `https://github.com/${owner}/${repo}/releases/tag/v2.0.0`, title: "Release 2.0.0", content: "Release 2.0.0 is available." });
  const duplicateRelease = { ...release, id: `${tag}-release-duplicate` };
  const changelog = source({ id: `${tag}-changelog`, sourceType: "changelog", url: `https://example.test/${tag}/CHANGELOG`, title: "Changelog 2.0.0 API update", content: "Changelog 2.0.0 lists the new API." });
  const pullRequest = source({ id: `${tag}-pr`, sourceType: "github_pull_request", providerId: "pr-2", url: `https://github.com/${owner}/${repo}/pull/2`, title: "Prepare release 2.0.0", content: "The release 2.0.0 pull request updates the examples." });
  const retained = deduplicateSources([release, duplicateRelease, changelog, pullRequest]);
  assert.equal(retained.length, 3, "same canonical source content is retained once");
  const [event] = clusterChanges(retained);
  assert.ok(event);
  assert.equal(event.supportingSourceIds.length, 2, "release, changelog, and PR form one event");
  await insertFixture(event, retained);

  const radar = await app.inject(`/api/radar?projectId=${encodeURIComponent(projectId)}`);
  assert.equal(radar.statusCode, 200);
  assert.equal(radar.json().events.length, 1);
  assert.equal(radar.json().events[0].id, event.id);
  const detail = await app.inject(`/api/changes/${encodeURIComponent(event.id)}`);
  assert.equal(detail.statusCode, 200);
  assert.equal(detail.json().sources.length, 3);
  const brief = await app.inject(`/api/changes/${encodeURIComponent(event.id)}/brief`);
  assert.equal(brief.statusCode, 200);
  assert.equal(brief.json().status, "ready");
  assert.equal(brief.json().evidence.length, 4, "each source plus one labelled explanation is retained");
  const task = await app.inject(`/api/changes/${encodeURIComponent(event.id)}/task`);
  assert.equal(task.statusCode, 200);
  assert.equal(task.json().eventId, event.id);
  assert.equal(task.json().starterCode, null, "the first release never executes arbitrary code");

  const storageValues = new Map<string, string>();
  Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: {
    getItem: (key: string) => storageValues.get(key) ?? null,
    setItem: (key: string, value: string) => { storageValues.set(key, value); },
    removeItem: (key: string) => { storageValues.delete(key); },
  } } });
  const workspace = await import(`../../apps/web/app/features/workspace/workspace-store.ts?e2e=${tag}`);
  workspace.saveWorkspaceItem(event.id);
  workspace.recordTaskResult(event.id, { completed: true, correct: false, misconceptionCode: "migration-boundary", resultAt: "2026-01-01T00:00:00.000Z" });
  assert.equal(workspace.getDueReviewCards(new Date("2026-01-03T00:00:00.000Z"))[0]?.eventId, event.id);
  Reflect.deleteProperty(globalThis, "window");
});

test("source and model failure paths never publish a confident brief", async () => {
  const failedEventId = `${tag}-failed`;
  await sql`INSERT INTO developer_source_snapshots (id, project_id, source_type, url, canonical_url, fetched_at, status, error, metadata) VALUES (${`${tag}-failed-source`}, ${projectId}, 'github_release', 'https://example.test/failed', 'https://example.test/failed', now(), 'failed', 'fixture timeout', '{}'::jsonb)`;
  await sql`INSERT INTO developer_change_events (id, project_id, event_type, title, source_url, detected_at, importance, change_status) VALUES (${failedEventId}, ${projectId}, 'release', 'Unavailable release', 'https://example.test/failed', now(), 10, 'failed')`;
  const response = await app.inject(`/api/changes/${failedEventId}/brief`);
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().status, "failed");
  assert.equal(response.json().whatChanged, "");
  assert.equal(response.json().modelVersion, null, "the deterministic fallback never claims a model result");
});

test("conflicting source classifications are visibly disputed", async () => {
  const release = source({ id: `${tag}-disputed-release`, sourceType: "github_release", providerId: "release-3", url: `https://github.com/${owner}/${repo}/releases/tag/v3.0.0`, title: "Release 3.0.0", content: "Release 3.0.0 is available." });
  const securityPr = source({ id: `${tag}-disputed-pr`, sourceType: "github_pull_request", providerId: "pr-3", url: `https://github.com/${owner}/${repo}/pull/3`, title: "Security patch for release 3.0.0", content: "Security vulnerability fix for release 3.0.0." });
  const [event] = clusterChanges([release, securityPr]);
  assert.ok(event);
  assert.equal(event.changeStatus, "disputed");
  await insertFixture(event, [release, securityPr]);
  const response = await app.inject(`/api/changes/${encodeURIComponent(event.id)}/brief`);
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().status, "uncertain");
  assert.match(response.json().uncertainty, /conflicting classifications/);
});
