import assert from "node:assert/strict";
import test from "node:test";
import { eventTypeLabel, importanceLabel, radarQuery } from "../app/features/radar/radar-view.ts";

test("radar query serialization omits empty filters", () => {
  assert.equal(radarQuery({ status: "new", projectId: "github:fastapi/fastapi", importance: "80" }), "?status=new&projectId=github%3Afastapi%2Ffastapi&importance=80");
  assert.equal(radarQuery({}), "");
});
test("radar labels cover change types and importance bands", () => {
  assert.equal(eventTypeLabel("breaking_change"), "Breaking change");
  assert.equal(eventTypeLabel("unknown"), "unknown");
  assert.equal(importanceLabel(90), "High");
  assert.equal(importanceLabel(50), "Medium");
  assert.equal(importanceLabel(10), "Low");
});

