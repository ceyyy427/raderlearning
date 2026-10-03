import { Link, useSearchParams } from "react-router";
import { ChangeEventCard } from "./ChangeEventCard";
import { radarQuery, type RadarEventView } from "./radar-view";

type Project = { id: string; name: string; owner: string; repo: string };
export type RadarData = { events: RadarEventView[]; projects: Project[]; asOf: string };

export function RadarInbox({ data }: { data: RadarData }) {
  const [params] = useSearchParams();
  const filters = { status: params.get("status") ?? "", projectId: params.get("projectId") ?? "", importance: params.get("importance") ?? "" };
  return (
    <div className="pb-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div><p className="mono text-[11px] uppercase tracking-[0.15em] text-accent">RaderLearning / Radar</p><h1 className="mt-2 text-[28px] font-semibold text-ink">Radar Inbox</h1><p className="mt-1 text-[14px] text-ink-3">Source-backed changes from the projects you follow.</p></div>
        <Link to="/projects" className="rounded-full bg-accent px-4 py-2 text-[13px] font-medium text-white">Manage projects</Link>
      </div>
      <form method="get" className="mb-5 grid gap-3 rounded-2xl border border-line-soft bg-surface p-4 sm:grid-cols-4">
        <label className="text-[12px] text-ink-3">Status<select name="status" defaultValue={filters.status} className="mt-1 block w-full rounded-lg border border-line-soft bg-bg px-2 py-2 text-[13px]"><option value="">All</option><option value="new">New</option><option value="read">Read</option><option value="learning">Learning</option><option value="completed">Completed</option><option value="disputed">Disputed</option><option value="failed">Failed</option></select></label>
        <label className="text-[12px] text-ink-3">Project<select name="projectId" defaultValue={filters.projectId} className="mt-1 block w-full rounded-lg border border-line-soft bg-bg px-2 py-2 text-[13px]"><option value="">All projects</option>{data.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label className="text-[12px] text-ink-3">Minimum importance<input name="importance" inputMode="numeric" pattern="[0-9]*" defaultValue={filters.importance} placeholder="0" className="mt-1 block w-full rounded-lg border border-line-soft bg-bg px-2 py-2 text-[13px]" /></label>
        <button className="self-end rounded-lg bg-ink px-3 py-2 text-[13px] font-medium text-surface" type="submit">Apply filters</button>
      </form>
      {data.events.length === 0 ? <div className="rounded-2xl border border-dashed border-line-soft bg-surface px-6 py-16 text-center"><h2 className="text-[18px] font-semibold text-ink">No changes yet</h2><p className="mt-2 text-[14px] text-ink-3">Add a project and run a sync to start your Radar.</p><Link className="mt-5 inline-flex text-[13px] font-medium text-accent hover:underline" to="/projects">Add a project →</Link></div> : <div className="grid gap-4">{data.events.map((event) => <ChangeEventCard key={event.id} event={event} />)}</div>}
    </div>
  );
}

