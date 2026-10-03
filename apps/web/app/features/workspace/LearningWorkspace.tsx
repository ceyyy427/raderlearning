import { Link } from "react-router";
import { getWorkspaceItems, isWorkspaceStorageAvailable, saveWorkspaceItem, subscribeWorkspace, type WorkspaceItem } from "./workspace-store";
import { useEffect, useState } from "react";

function useItems(): WorkspaceItem[] {
  const [items, setItems] = useState<WorkspaceItem[]>(() => getWorkspaceItems());
  useEffect(() => subscribeWorkspace(() => setItems(getWorkspaceItems())), []);
  return items;
}

export function LearningWorkspace() {
  const items = useItems();
  const available = isWorkspaceStorageAvailable();
  return <div className="pb-8"><div className="mb-6"><p className="mono text-[11px] uppercase tracking-[0.15em] text-accent">RaderLearning / Workspace</p><h1 className="mt-2 text-[28px] font-semibold text-ink">Learning Workspace</h1><p className="mt-1 text-[14px] text-ink-3">Saved changes stay in this browser and remain linked to their source event.</p></div>{!available && <p role="status" className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-900">Browser storage is unavailable. Your learning state cannot be saved in this session.</p>}{items.length === 0 ? <div className="rounded-2xl border border-dashed border-line-soft bg-surface px-6 py-16 text-center"><h2 className="text-[18px] font-semibold text-ink">Your workspace is empty</h2><p className="mt-2 text-[14px] text-ink-3">Save a Change Brief from Radar to begin.</p><Link className="mt-5 inline-flex text-[13px] font-medium text-accent hover:underline" to="/radar">Open Radar →</Link></div> : <div className="grid gap-3">{items.map((item) => <article key={item.eventId} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line-soft bg-surface p-5"><div><h2 className="text-[16px] font-semibold text-ink">Change {item.eventId}</h2><p className="mt-1 text-[12px] text-ink-4">Saved {new Date(item.savedAt).toLocaleString()}</p></div><Link className="rounded-lg bg-ink px-3 py-2 text-[13px] text-surface" to={`/changes/${encodeURIComponent(item.eventId)}`}>Review brief</Link></article>)}</div>}</div>;
}
