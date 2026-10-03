import assert from "node:assert/strict";
import { after, test } from "node:test";

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
let instance = 0;
after(() => {
  if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
  else Reflect.deleteProperty(globalThis, "window");
});

async function workspace(raw: string | null = null) {
  const values = new Map<string, string>();
  if (raw !== null) values.set("raderlearning-learning-workspace-v1", raw);
  const localStorage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
    get length() { return values.size; },
    key: (index: number) => [...values.keys()][index] ?? null,
  };
  Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage } });
  const store: typeof import("../app/features/workspace/workspace-store.ts") = await import(`../app/features/workspace/workspace-store.ts?test=${instance++}`);
  return { store, values };
}

test("workspace saves event IDs with timestamps and survives a fresh module/page read", async () => {
  const first = await workspace();
  first.store.saveWorkspaceItem("event-1");
  const saved = first.store.readWorkspaceSnapshot();
  assert.equal(saved.items.length, 1);
  assert.equal(saved.items[0]?.eventId, "event-1");
  assert.ok(saved.items[0]?.savedAt);
  const reloaded = await workspace(first.values.get(first.store.WORKSPACE_STORAGE_KEY)!);
  assert.equal(reloaded.store.getWorkspaceItems()[0]?.eventId, "event-1");
});

test("invalid JSON and unsupported schema reset to a versioned empty state", async () => {
  const corrupt = await workspace("not-json");
  assert.deepEqual(corrupt.store.readWorkspaceSnapshot(), { version: 1, items: [], taskResults: [], reviewCards: [] });
  const unsupported = await workspace(JSON.stringify({ version: 99, items: [], taskResults: [], reviewCards: [] }));
  assert.equal(unsupported.store.readWorkspaceSnapshot().items.length, 0);
  assert.equal(JSON.parse(unsupported.values.get(unsupported.store.WORKSPACE_STORAGE_KEY)!).version, 1);
});

test("task results retain completion and schedule due cards without mutating on read", async () => {
  const { store } = await workspace();
  const resultAt = "2026-01-01T00:00:00.000Z";
  store.recordTaskResult("event-wrong", { completed: true, correct: false, misconceptionCode: "version-boundary", resultAt });
  store.recordTaskResult("event-right", { completed: true, correct: true, misconceptionCode: null, resultAt });
  const snapshot = store.readWorkspaceSnapshot();
  assert.equal(snapshot.taskResults.find((result) => result.eventId === "event-wrong")?.completed, true);
  assert.equal(snapshot.reviewCards.find((card) => card.eventId === "event-wrong")?.masteryState, "learning");
  assert.equal(snapshot.reviewCards.find((card) => card.eventId === "event-wrong")?.misconceptionCode, "version-boundary");
  const due = store.getDueReviewCards(new Date("2026-01-03T00:00:00.000Z"));
  assert.equal(due.length, 1);
  assert.equal(due[0]?.eventId, "event-wrong");
  assert.equal(store.readWorkspaceSnapshot().reviewCards.length, 2);
});

test("storage failures degrade to empty state and never throw", async () => {
  Object.defineProperty(globalThis, "window", { configurable: true, value: { get localStorage() { throw new Error("blocked"); } } });
  const store: typeof import("../app/features/workspace/workspace-store.ts") = await import(`../app/features/workspace/workspace-store.ts?test=${instance++}`);
  assert.equal(store.isWorkspaceStorageAvailable(), false);
  assert.doesNotThrow(() => store.saveWorkspaceItem("event"));
  assert.deepEqual(store.readWorkspaceSnapshot().items, []);
});
