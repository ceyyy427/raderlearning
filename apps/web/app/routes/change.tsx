import { useLoaderData } from "react-router";
import type { Route } from "./+types/change";
import { loadOr404 } from "../lib/api.server";
import { ChangeBrief } from "../features/briefs/ChangeBrief";

type Brief = { eventId: string; whatChanged: string; whyItMatters: string; affectedUsers: string[]; migrationRequired: boolean | null; beforeAfter: Array<{ before: string; after: string; language: string | null; sourceIds: string[] }>; risks: string[]; relatedConcepts: string[]; evidence: Array<{ sourceId: string; kind: string; excerpt: string; url: string }>; status: string; uncertainty: string | null };
type Task = { taskType: string; question: string; solution: string; expectedConcept: string; difficulty: string; starterCode: string | null };
export async function loader({ params, request }: Route.LoaderArgs) { const id = encodeURIComponent(params.id ?? ""); const [brief, task] = await Promise.all([loadOr404<Brief>(`/api/changes/${id}/brief`, { signal: request.signal }), loadOr404<Task>(`/api/changes/${id}/task`, { signal: request.signal })]); return { brief, task }; }
export function meta({ loaderData }: Route.MetaArgs) { return [{ title: `${loaderData?.brief.whatChanged ?? "Change Brief"} — RaderLearning` }]; }
export default function ChangeRoute() { const { brief, task } = useLoaderData<typeof loader>(); return <ChangeBrief brief={brief} task={task} />; }

