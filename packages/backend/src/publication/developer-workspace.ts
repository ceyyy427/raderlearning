import { sql } from "../db.ts";

export type DeveloperReviewCardRow = { id: string; eventId: string; misconceptionCode: string | null; reviewDueAt: string; masteryState: "new" | "learning" | "mastered"; userNote: string | null };
export type DeveloperPersonalNoteRow = { id: string; eventId: string; body: string; createdAt: string; updatedAt: string };

/** Internal publication-owned read face reserved for an authenticated persistence/export boundary. */
export async function listDeveloperReviewCards(eventId: string): Promise<DeveloperReviewCardRow[]> {
  const rows = await sql<{ id: string; event_id: string; misconception_code: string | null; review_due_at: Date | string; mastery_state: "new" | "learning" | "mastered"; user_note: string | null }[]>`
    SELECT id, event_id, misconception_code, review_due_at, mastery_state, user_note
    FROM developer_review_cards WHERE event_id = ${eventId} ORDER BY review_due_at ASC, id ASC`;
  return rows.map((row) => ({ id: row.id, eventId: row.event_id, misconceptionCode: row.misconception_code, reviewDueAt: new Date(row.review_due_at).toISOString(), masteryState: row.mastery_state, userNote: row.user_note }));
}

export async function listDeveloperPersonalNotes(eventId: string): Promise<DeveloperPersonalNoteRow[]> {
  const rows = await sql<{ id: string; event_id: string; body: string; created_at: Date | string; updated_at: Date | string }[]>`
    SELECT id, event_id, body, created_at, updated_at
    FROM developer_personal_notes WHERE event_id = ${eventId} ORDER BY created_at DESC, id ASC`;
  return rows.map((row) => ({ id: row.id, eventId: row.event_id, body: row.body, createdAt: new Date(row.created_at).toISOString(), updatedAt: new Date(row.updated_at).toISOString() }));
}
