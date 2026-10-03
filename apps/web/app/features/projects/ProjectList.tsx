import { useState } from "react";
import { Link } from "react-router";

type Project = { id: string; owner: string; repo: string; name: string; description: string | null; status: string; lastSyncedAt: string | null };
const API = "/api/projects";

export function ProjectList({ projects }: { projects: Project[] }) {
  const [message, setMessage] = useState<string | null>(null);
  async function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(null);
    const body = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!response.ok) { setMessage("Could not add this project. Check the owner and repository."); return; }
    window.location.reload();
  }
  async function sync(id: string) {
    const response = await fetch(`${API}/${encodeURIComponent(id)}/sync`, { method: "POST" });
    setMessage(response.ok ? "Sync queued." : "Sync could not be queued.");
  }
  return <div className="pb-8"><div className="mb-6"><p className="mono text-[11px] uppercase tracking-[0.15em] text-accent">RaderLearning / Projects</p><h1 className="mt-2 text-[28px] font-semibold text-ink">Projects</h1><p className="mt-1 text-[14px] text-ink-3">Follow the open-source projects you want to understand.</p></div>
    <form onSubmit={add} className="mb-6 grid gap-3 rounded-2xl border border-line-soft bg-surface p-5 sm:grid-cols-[1fr_1fr_1.4fr_auto]"><label className="text-[12px] text-ink-3">Owner<input required name="owner" placeholder="fastapi" className="mt-1 block w-full rounded-lg border border-line-soft bg-bg px-2 py-2 text-[13px]" /></label><label className="text-[12px] text-ink-3">Repository<input required name="repo" placeholder="fastapi" className="mt-1 block w-full rounded-lg border border-line-soft bg-bg px-2 py-2 text-[13px]" /></label><label className="text-[12px] text-ink-3">Display name<input name="name" placeholder="FastAPI" className="mt-1 block w-full rounded-lg border border-line-soft bg-bg px-2 py-2 text-[13px]" /></label><button className="self-end rounded-lg bg-accent px-3 py-2 text-[13px] font-medium text-white" type="submit">Add project</button></form>
    {message && <p role="status" className="mb-4 rounded-lg bg-bg-muted px-3 py-2 text-[13px] text-ink-2">{message}</p>}
    {projects.length === 0 ? <div className="rounded-2xl border border-dashed border-line-soft bg-surface px-6 py-16 text-center text-[14px] text-ink-3">No projects yet.</div> : <div className="grid gap-3">{projects.map((project) => <article key={project.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line-soft bg-surface p-5"><div><h2 className="text-[17px] font-semibold text-ink">{project.name}</h2><p className="mt-1 text-[13px] text-ink-3">{project.owner}/{project.repo}{project.description ? ` · ${project.description}` : ""}</p><p className="mt-2 text-[12px] text-ink-4">{project.status} · {project.lastSyncedAt ? `synced ${new Date(project.lastSyncedAt).toLocaleString()}` : "not synced"}</p></div><div className="flex gap-2"><button type="button" onClick={() => sync(project.id)} className="rounded-lg border border-line-soft px-3 py-2 text-[13px] text-ink-2 hover:border-accent">Sync</button><Link to={`/radar?projectId=${encodeURIComponent(project.id)}`} className="rounded-lg bg-ink px-3 py-2 text-[13px] text-surface">View Radar</Link></div></article>)}</div>}
  </div>;
}

