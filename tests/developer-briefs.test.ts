import "./setup.ts";
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { buildApp } from "../apps/api/src/app.ts";
import { closeDb, sql } from "@aihot/backend/db";

const app = await buildApp();
const projectId = `github:brief-${Date.now().toString(36)}/fixture`;
const eventId = `change-brief-${Date.now().toString(36)}`;
const sourceId = `source-brief-${Date.now().toString(36)}`;
await sql`INSERT INTO developer_projects (id, provider, owner, repo, name, watch_rules) VALUES (${projectId}, 'github', 'brief-fixture', 'fixture', 'Brief fixture', '{"releases":true,"issues":true,"pullRequests":true,"documentation":false,"changelog":true,"keywords":[]}'::jsonb)`;
await sql`INSERT INTO developer_change_events (id, project_id, event_type, title, source_url, detected_at, version_from, version_to, importance, change_status) VALUES (${eventId}, ${projectId}, 'breaking_change', 'Fixture API migration', 'https://example.test/brief', now(), 'v1', 'v2', 90, 'new')`;
await sql`INSERT INTO developer_source_snapshots (id, project_id, source_type, url, canonical_url, fetched_at, content_hash, raw_content, version_from, version_to, status, metadata) VALUES (${sourceId}, ${projectId}, 'github_release', 'https://example.test/brief', 'https://example.test/brief', now(), 'brief-hash', 'Fixture migration release', 'v1', 'v2', 'ok', '{"title":"Fixture API migration","relatedConcepts":["API contracts"]}'::jsonb)`;
after(async () => { await sql`DELETE FROM developer_projects WHERE id = ${projectId}`; await app.close(); await closeDb(); });

test("brief and learning task are source-backed and linked", async () => {
  const brief = await app.inject(`/api/changes/${eventId}/brief`);
  assert.equal(brief.statusCode, 200);
  assert.equal(brief.json().eventId, eventId);
  assert.equal(brief.json().status, "ready");
  assert.equal(brief.json().evidence[0].sourceId, sourceId);
  const task = await app.inject(`/api/changes/${eventId}/task`);
  assert.equal(task.statusCode, 200);
  assert.equal(task.json().eventId, eventId);
  assert.equal(task.json().taskType, "migration_choice");
  assert.equal(task.json().starterCode, null);
});

