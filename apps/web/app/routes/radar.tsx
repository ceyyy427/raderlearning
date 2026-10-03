import { useLoaderData } from "react-router";
import type { Route } from "./+types/radar";
import { loadOr404 } from "../lib/api.server";
import { RadarInbox, type RadarData } from "../features/radar/RadarInbox";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const query = url.searchParams.toString();
  return loadOr404<RadarData>(`/api/radar${query ? `?${query}` : ""}`, { signal: request.signal });
}
export function meta() { return [{ title: "Radar Inbox — RaderLearning" }]; }
export default function RadarRoute() { return <RadarInbox data={useLoaderData<typeof loader>()} />; }
