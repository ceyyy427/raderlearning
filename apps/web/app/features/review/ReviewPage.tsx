import { Link } from "react-router";
import { getDueReviewCards, isWorkspaceStorageAvailable, saveReviewNote, subscribeWorkspace, type ReviewCard } from "../workspace/workspace-store";
import { useEffect, useState } from "react";

function readDue(): ReviewCard[] { return getDueReviewCards(new Date()); }

export function ReviewPage() {
  const [cards, setCards] = useState<ReviewCard[]>(() => readDue());
  const [notes, setNotes] = useState<Record<string, string>>({});
  useEffect(() => {
    const refresh = () => setCards(readDue());
    refresh();
    return subscribeWorkspace(refresh);
  }, []);
  useEffect(() => setNotes((current) => Object.fromEntries(cards.map((card) => [card.eventId, current[card.eventId] ?? card.userNote ?? ""]))), [cards]);
  const available = isWorkspaceStorageAvailable();
  return <div className="pb-8"><div className="mb-6"><p className="mono text-[11px] uppercase tracking-[0.15em] text-accent">RaderLearning / Review</p><h1 className="mt-2 text-[28px] font-semibold text-ink">Review</h1><p className="mt-1 text-[14px] text-ink-3">Due cards return you to the original Change Brief.</p></div>{!available && <p role="status" className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-900">Browser storage is unavailable.</p>}{cards.length === 0 ? <div className="rounded-2xl border border-dashed border-line-soft bg-surface px-6 py-16 text-center text-[14px] text-ink-3">No review cards are due.</div> : <div className="grid gap-3">{cards.map((card) => { const note = notes[card.eventId] ?? card.userNote ?? ""; return <article key={card.id} className="rounded-2xl border border-line-soft bg-surface p-5"><div className="flex items-center justify-between gap-3"><h2 className="text-[16px] font-semibold text-ink">Review {card.eventId}</h2><span className="text-[12px] text-ink-4">{card.masteryState}</span></div>{card.misconceptionCode && <p className="mt-2 text-[13px] text-ink-3">Misconception: {card.misconceptionCode}</p>}<label className="mt-3 block text-[12px] text-ink-3">Plain-text note<textarea value={note} maxLength={2000} onChange={(event) => setNotes((current) => ({ ...current, [card.eventId]: event.target.value }))} onBlur={() => saveReviewNote(card.eventId, note)} rows={2} className="mt-1 block w-full rounded-lg border border-line-soft bg-field px-3 py-2 text-[13px] text-ink outline-none focus:border-accent" placeholder="Record what to verify next time" /></label><Link className="mt-4 inline-flex text-[13px] font-medium text-accent hover:underline" to={`/changes/${encodeURIComponent(card.eventId)}`}>Open Change Brief →</Link></article>; })}</div>}</div>;
}
