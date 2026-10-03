import "./setup.ts";
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { buildApp } from "../apps/api/src/app.ts";
import { closeDb, sql } from "@aihot/backend/db";

const app = await buildApp();
const projectId = `github:test-${Date.now().toString(36)}/radar`;
after(async () => { await sql`DELETE FROM developer_projects WHERE id = ${projectId}`; await app.close(); await closeDb(); });

test("projects and empty radar have stable HTTP contracts", async () => {
  const created = await app.inject({ method: "POST", url: "/api/projects", payload: { owner: projectId.slice(7).split("/")[0], repo: "radar", name: "Radar fixture" } });
  assert.equal(created.statusCode, 201);
  assert.equal(created.json().id, projectId);
  const repeated = await app.inject({ method: "POST", url: "/api/projects", payload: { owner: projectId.slice(7).split("/")[0], repo: "radar" } });
  assert.equal(repeated.statusCode, 201);
  assert.equal(repeated.json().name, "Radar fixture", "omitted optional fields preserve the existing project");
  const projects = await app.inject("/api/projects");
  assert.equal(projects.statusCode, 200);
  assert.equal(projects.json().projects.some((p: { id: string }) => p.id === projectId), true);
  const radar = await app.inject(`/api/radar?projectId=${encodeURIComponent(projectId)}`);
  assert.equal(radar.statusCode, 200);
  assert.deepEqual(radar.json().events, []);
});

test("radar filters and change detail expose source links", async () => {
  const eventId = `change-${Date.now().toString(36)}`;
  const sourceId = `source-${Date.now().toString(36)}`;
  await sql`
    INSERT INTO developer_change_events (id, project_id, event_type, title, source_url, detected_at, importance, change_status)
    VALUES (${eventId}, ${projectId}, 'security', 'Security fix', 'https://github.com/test/radar/security', now(), 95, 'new')`;
  await sql`
    INSERT INTO developer_source_snapshots (id, project_id, source_type, url, canonical_url, fetched_at, status, metadata)
    VALUES (${sourceId}, ${projectId}, 'github_issue', 'https://github.com/test/radar/security', 'https://github.com/test/radar/security', now(), 'ok', '{}'::jsonb)`;
  const filtered = await app.inject(`/api/radar?importance=90&projectId=${encodeURIComponent(projectId)}`);
  assert.equal(filtered.statusCode, 200);
  assert.equal(filtered.json().events[0].id, eventId);
  const detail = await app.inject(`/api/changes/${eventId}`);
  assert.equal(detail.statusCode, 200);
  assert.equal(detail.json().sources[0].url, "https://github.com/test/radar/security");
  assert.equal((await app.inject("/api/radar?status=bad")).statusCode, 400);
  assert.equal((await app.inject("/api/changes/missing")).statusCode, 404);
});
