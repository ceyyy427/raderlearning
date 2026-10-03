import { useEffect, useState } from "react";
import { LearningTask } from "../learning/LearningTask";
import { getWorkspaceItems, saveWorkspaceItem, subscribeWorkspace } from "../workspace/workspace-store";

type Brief = { eventId: string; whatChanged: string; whyItMatters: string; affectedUsers: string[]; migrationRequired: boolean | null; beforeAfter: Array<{ before: string; after: string; language: string | null; sourceIds: string[] }>; risks: string[]; relatedConcepts: string[]; evidence: Array<{ sourceId: string; kind: string; excerpt: string; url: string }>; status: string; uncertainty: string | null };
type Task = { taskType: string; question: string; solution: string; expectedConcept: string; difficulty: string; starterCode: string | null };

export function ChangeBrief({ brief, task }: { brief: Brief; task: Task }) {
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const refresh = () => setSaved(getWorkspaceItems().some((item) => item.eventId === brief.eventId));
    refresh();
    return subscribeWorkspace(refresh);
  }, [brief.eventId]);
  const uncertain = brief.status !== "ready";
  return <div className="pb-8"><div className="mb-6"><p className="mono text-[11px] uppercase tracking-[0.15em] text-accent">RaderLearning / Change Brief</p><div className="mt-2 flex flex-wrap items-center gap-2"><h1 className="text-[28px] font-semibold text-ink">{brief.whatChanged || "Change details unavailable"}</h1><span className="rounded-full bg-bg-muted px-2 py-1 text-[11px] uppercase tracking-wide text-ink-4">{brief.status}</span></div>{uncertain && <p role="status" className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-900">{brief.uncertainty ?? "Review the original evidence before acting."}</p>}</div>
    <div className="grid gap-4"><div className="flex flex-wrap gap-2"><button type="button" onClick={() => { saveWorkspaceItem(brief.eventId); setSaved(true); }} className="rounded-lg bg-accent px-3 py-2 text-[13px] font-medium text-white">{saved ? "Saved to Workspace" : "Save to Workspace"}</button><a href="/workspace" className="rounded-lg border border-line-soft px-3 py-2 text-[13px] text-ink-2">Open Workspace</a></div><section className="rounded-2xl border border-line-soft bg-surface p-5"><h2 className="text-[18px] font-semibold text-ink">What changed</h2><p className="mt-3 text-[15px] leading-relaxed text-ink-2">{brief.whatChanged || "No verified change description is available."}</p></section>
      <section className="rounded-2xl border border-line-soft bg-surface p-5"><h2 className="text-[18px] font-semibold text-ink">Why it matters</h2><p className="mt-3 text-[15px] leading-relaxed text-ink-2">{brief.whyItMatters || "No consequence can be stated without usable evidence."}</p></section>
      <section className="rounded-2xl border border-line-soft bg-surface p-5"><h2 className="text-[18px] font-semibold text-ink">Who is affected</h2>{brief.affectedUsers.length ? <ul className="mt-3 list-disc pl-5 text-[14px] text-ink-2">{brief.affectedUsers.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="mt-3 text-[14px] text-ink-3">No affected group is named by the source.</p>}</section>
      <section className="rounded-2xl border border-line-soft bg-surface p-5"><h2 className="text-[18px] font-semibold text-ink">Before / After</h2>{brief.beforeAfter.length ? <div className="mt-3 grid gap-3 md:grid-cols-2">{brief.beforeAfter.map((item) => <div key={item.sourceIds.join(",")} className="grid gap-2 md:grid-cols-2"><pre className="overflow-x-auto rounded-lg bg-bg-sunk p-3 text-[12px]">{item.before}</pre><pre className="overflow-x-auto rounded-lg bg-bg-sunk p-3 text-[12px]">{item.after}</pre></div>)}</div> : <p className="mt-3 text-[14px] text-ink-3">No verified code example was provided.</p>}</section>
      <section className="rounded-2xl border border-line-soft bg-surface p-5"><h2 className="text-[18px] font-semibold text-ink">Migration</h2><p className="mt-3 text-[14px] text-ink-2">{brief.migrationRequired === true ? "Migration evidence is present; verify the source before upgrading." : brief.migrationRequired === false ? "No migration requirement was established by the evidence." : "Migration requirement is uncertain."}</p></section>
      <section className="rounded-2xl border border-line-soft bg-surface p-5"><h2 className="text-[18px] font-semibold text-ink">Original evidence</h2><div className="mt-3 grid gap-3">{brief.evidence.map((item) => <article key={`${item.sourceId}-${item.kind}`} className="rounded-lg bg-bg-muted p-3"><div className="flex flex-wrap items-center justify-between gap-2 text-[11px] uppercase tracking-wide text-ink-4"><span>{item.kind} · {item.sourceId}</span><a href={item.url} target="_blank" rel="noreferrer" className="text-accent hover:underline">Open source ↗</a></div><p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-ink-2">{item.excerpt}</p></article>)}</div></section>
      <LearningTask eventId={brief.eventId} task={task} />
    </div>
  </div>;
}
