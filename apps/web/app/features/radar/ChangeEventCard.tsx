import { eventTypeLabel, importanceLabel, type RadarEventView } from "./radar-view";

export function ChangeEventCard({ event }: { event: RadarEventView }) {
  return (
    <article className="rounded-2xl border border-line-soft bg-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-ink-4">
        <span>{event.project.owner}/{event.project.repo}</span>
        <span aria-label={`importance ${importanceLabel(event.importance)}`} className="rounded-full bg-bg-muted px-2 py-1">{importanceLabel(event.importance)} · {event.importance}</span>
        <span>{eventTypeLabel(event.eventType)}</span>
      </div>
      <h2 className="mt-3 text-[18px] font-semibold leading-snug text-ink"><a href={event.sourceUrl} target="_blank" rel="noreferrer" className="hover:text-accent">{event.title || "Untitled change"}</a></h2>
      <div className="mt-3 flex flex-wrap gap-2 text-[12px] text-ink-3">
        <span>Status: {event.status}</span>
        <span>{event.migrationRequired === true ? "Migration required" : event.migrationRequired === false ? "No migration flag" : "Migration uncertain"}</span>
        {event.supportingSourceIds.length > 0 && <span>{event.supportingSourceIds.length} supporting sources</span>}
      </div>
      {event.uncertainty && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-900">Uncertainty: {event.uncertainty}</p>}
      <a className="mt-4 inline-flex text-[13px] font-medium text-accent hover:underline" href={event.sourceUrl} target="_blank" rel="noreferrer">Open original source ↗</a>
    </article>
  );
}
