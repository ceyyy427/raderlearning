import type { ReviewCard, MasteryState } from "@aihot/developer-domain";
export type { ReviewCard } from "@aihot/developer-domain";

/** Versioned, browser-only workspace storage. Keep this key stable once released. */
export const WORKSPACE_STORAGE_KEY = "raderlearning-learning-workspace-v1";
export const WORKSPACE_SCHEMA_VERSION = 1 as const;
/** Backwards-friendly aliases for callers that refer to the browser key generically. */
export const WORKSPACE_KEY = WORKSPACE_STORAGE_KEY;
export const STORAGE_KEY = WORKSPACE_STORAGE_KEY;

export type TaskResult = {
  completed: boolean;
  correct: boolean;
  misconceptionCode: string | null;
  /** ISO timestamp; omitted input is stamped when recorded. */
  resultAt?: string;
};

export type WorkspaceItem = {
  eventId: string;
  savedAt: string;
};

export type WorkspaceSnapshot = {
  version: typeof WORKSPACE_SCHEMA_VERSION;
  items: WorkspaceItem[];
  taskResults: Array<TaskResult & { eventId: string }>;
  reviewCards: ReviewCard[];
};

const EMPTY_SNAPSHOT: WorkspaceSnapshot = { version: WORKSPACE_SCHEMA_VERSION, items: [], taskResults: [], reviewCards: [] };
const REVIEW_DELAY_MS = 24 * 60 * 60 * 1000;
const MASTERED_REVIEW_DELAY_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_ITEMS = 500;
const MAX_RESULTS = 2_000;
const MAX_CARDS = 2_000;
let cachedRaw: string | null | undefined;
let cachedSnapshot: WorkspaceSnapshot | null = null;

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function notify() {
  for (const listener of listeners) listener();
}
const listeners = new Set<() => void>();
let listening = false;
function ensureStorageListener() {
  if (listening || typeof window === "undefined") return;
  try {
    window.addEventListener("storage", (event) => {
      if (!event.storageArea || event.storageArea === storage()) {
        if (event.key === null || event.key === WORKSPACE_STORAGE_KEY) notify();
      }
    });
    listening = true;
  } catch {
    // Some privacy modes expose localStorage but reject event listeners.
  }
}

function canUseStorage(): boolean {
  const s = storage();
  if (!s) return false;
  try {
    const probe = `${WORKSPACE_STORAGE_KEY}-probe`;
    s.setItem(probe, "1");
    s.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export function isWorkspaceStorageAvailable(): boolean {
  return canUseStorage();
}

function isDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function emptySnapshot(): WorkspaceSnapshot {
  return { version: WORKSPACE_SCHEMA_VERSION, items: [], taskResults: [], reviewCards: [] };
}

function validEventId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 200;
}

function normalizeTaskResult(value: unknown): TaskResult | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.completed !== "boolean" || typeof record.correct !== "boolean") return null;
  const resultAt = isDate(record.resultAt) ? record.resultAt : null;
  if (!resultAt) return null;
  return {
    completed: record.completed,
    correct: record.correct,
    misconceptionCode: typeof record.misconceptionCode === "string" ? record.misconceptionCode.slice(0, 160) : null,
    resultAt,
  };
}

function normalizeCard(value: unknown): ReviewCard | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (!validEventId(record.id) || !validEventId(record.eventId) || !isDate(record.reviewDueAt)) return null;
  const masteryState: MasteryState = record.masteryState === "learning" || record.masteryState === "mastered" ? record.masteryState : "new";
  return {
    id: record.id,
    eventId: record.eventId,
    misconceptionCode: typeof record.misconceptionCode === "string" ? record.misconceptionCode.slice(0, 160) : null,
    reviewDueAt: record.reviewDueAt,
    masteryState,
    userNote: typeof record.userNote === "string" ? record.userNote.slice(0, 2_000) : null,
  };
}

function normalizeSnapshot(value: unknown): WorkspaceSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (record.version !== WORKSPACE_SCHEMA_VERSION || !Array.isArray(record.items) || !Array.isArray(record.taskResults) || !Array.isArray(record.reviewCards)) return null;
  const items: WorkspaceItem[] = [];
  for (const item of record.items) {
    if (!item || typeof item !== "object") continue;
    const v = item as Record<string, unknown>;
    if (validEventId(v.eventId) && isDate(v.savedAt)) items.push({ eventId: v.eventId, savedAt: v.savedAt });
  }
  const taskResults: WorkspaceSnapshot["taskResults"] = [];
  for (const result of record.taskResults) {
    if (!result || typeof result !== "object") continue;
    const v = result as Record<string, unknown>;
    const normalized = normalizeTaskResult(v);
    if (normalized && validEventId(v.eventId)) taskResults.push({ eventId: v.eventId, ...normalized });
  }
  const reviewCards = record.reviewCards.map(normalizeCard).filter((card): card is ReviewCard => card !== null);
  return { version: WORKSPACE_SCHEMA_VERSION, items: items.slice(0, MAX_ITEMS), taskResults: taskResults.slice(0, MAX_RESULTS), reviewCards: reviewCards.slice(0, MAX_CARDS) };
}

function writeSnapshot(snapshot: WorkspaceSnapshot): boolean {
  const s = storage();
  if (!s) return false;
  try {
    const raw = JSON.stringify(snapshot);
    s.setItem(WORKSPACE_STORAGE_KEY, raw);
    cachedRaw = raw;
    cachedSnapshot = snapshot;
    notify();
    return true;
  } catch {
    return false;
  }
}

/** Reads and validates the versioned snapshot. Bad data is replaced by an empty state when possible. */
export function readWorkspaceSnapshot(): WorkspaceSnapshot {
  ensureStorageListener();
  const s = storage();
  if (!s) {
    cachedRaw = null;
    cachedSnapshot ??= emptySnapshot();
    return cachedSnapshot;
  }
  let raw: string | null = null;
  try {
    raw = s.getItem(WORKSPACE_STORAGE_KEY);
  } catch {
    cachedRaw = null;
    cachedSnapshot ??= emptySnapshot();
    return cachedSnapshot;
  }
  if (raw === cachedRaw && cachedSnapshot) return cachedSnapshot;
  if (!raw) {
    cachedRaw = raw;
    cachedSnapshot = emptySnapshot();
    return cachedSnapshot;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    const normalized = normalizeSnapshot(parsed);
    if (normalized) {
      cachedRaw = raw;
      cachedSnapshot = normalized;
      return normalized;
    }
  } catch {
    // Corrupt JSON is reset below, without leaking an exception to the page.
  }
  const empty = emptySnapshot();
  writeSnapshot(empty);
  return empty;
}

/** Alias kept as a small read API for pages and callers. */
export const getWorkspaceSnapshot = readWorkspaceSnapshot;
export const readWorkspace = readWorkspaceSnapshot;
export function getWorkspaceItems(): WorkspaceItem[] { return readWorkspaceSnapshot().items; }
export function getTaskResults(): Array<TaskResult & { eventId: string }> { return readWorkspaceSnapshot().taskResults; }
export function getReviewCards(): ReviewCard[] { return readWorkspaceSnapshot().reviewCards; }

export function subscribeWorkspace(listener: () => void): () => void {
  ensureStorageListener();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Saves a ChangeEvent reference once, retaining its first saved timestamp. */
export function saveWorkspaceItem(eventId: string): void {
  if (!validEventId(eventId)) return;
  const snapshot = readWorkspaceSnapshot();
  if (snapshot.items.some((item) => item.eventId === eventId)) return;
  const next: WorkspaceSnapshot = {
    ...snapshot,
    items: [{ eventId, savedAt: new Date().toISOString() }, ...snapshot.items].slice(0, MAX_ITEMS),
  };
  writeSnapshot(next);
}

function cardForResult(eventId: string, result: TaskResult): ReviewCard {
  const resultAt = isDate(result.resultAt) ? result.resultAt : new Date().toISOString();
  const due = new Date(Date.parse(resultAt) + (result.correct ? MASTERED_REVIEW_DELAY_MS : REVIEW_DELAY_MS)).toISOString();
  return {
    id: `review-${eventId}`,
    eventId,
    misconceptionCode: result.correct ? null : result.misconceptionCode,
    reviewDueAt: due,
    masteryState: result.correct ? "mastered" : "learning",
    userNote: null,
  };
}

/** Records a safe answer result and schedules one review card; no code or user input is executed. */
export function recordTaskResult(eventId: string, result: TaskResult): void {
  if (!validEventId(eventId) || !result || typeof result.completed !== "boolean" || typeof result.correct !== "boolean") return;
  const resultAt = isDate(result.resultAt) ? result.resultAt : new Date().toISOString();
  const normalized: TaskResult = {
    completed: result.completed,
    correct: result.correct,
    misconceptionCode: typeof result.misconceptionCode === "string" ? result.misconceptionCode.slice(0, 160) : null,
    resultAt,
  };
  const snapshot = readWorkspaceSnapshot();
  const item = snapshot.items.some((entry) => entry.eventId === eventId) ? snapshot.items : [{ eventId, savedAt: new Date().toISOString() }, ...snapshot.items];
  const taskResults = [{ eventId, ...normalized }, ...snapshot.taskResults.filter((entry) => entry.eventId !== eventId)].slice(0, MAX_RESULTS);
  const reviewCards = normalized.completed
    ? [cardForResult(eventId, normalized), ...snapshot.reviewCards.filter((card) => card.eventId !== eventId)].slice(0, MAX_CARDS)
    : snapshot.reviewCards;
  writeSnapshot({ ...snapshot, items: item.slice(0, MAX_ITEMS), taskResults, reviewCards });
}

/** Updates a plain-text note on the event's review card. */
export function saveReviewNote(eventId: string, note: string): void {
  if (!validEventId(eventId)) return;
  const snapshot = readWorkspaceSnapshot();
  const reviewCards = snapshot.reviewCards.map((card) => card.eventId === eventId ? { ...card, userNote: note.slice(0, 2_000) } : card);
  writeSnapshot({ ...snapshot, reviewCards });
}

export function getDueReviewCards(now: Date): ReviewCard[] {
  const nowMs = now.getTime();
  if (!Number.isFinite(nowMs)) return [];
  return readWorkspaceSnapshot().reviewCards.filter((card) => Date.parse(card.reviewDueAt) <= nowMs).map((card) => ({ ...card }));
}
