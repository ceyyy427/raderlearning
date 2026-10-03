import { useLoaderData } from "react-router";
import type { Route } from "./+types/projects";
import { loadOr404 } from "../lib/api.server";
import { ProjectList } from "../features/projects/ProjectList";

export async function loader({ request }: Route.LoaderArgs) { return loadOr404<{ projects: Awaited<ReturnType<typeof import("../lib/api.server")["apiGet"]>> extends never ? never : Array<{ id: string; owner: string; repo: string; name: string; description: string | null; status: string; lastSyncedAt: string | null }> }>("/api/projects", { signal: request.signal }); }
export function meta() { return [{ title: "Projects — RaderLearning" }]; }
export default function ProjectsRoute() { const data = useLoaderData<typeof loader>(); return <ProjectList projects={data.projects} />; }

