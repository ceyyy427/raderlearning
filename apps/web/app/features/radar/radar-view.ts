export type RadarEventView = {
  id: string;
  projectId: string;
  eventType: string;
  title: string;
  sourceUrl: string;
  supportingSourceIds: string[];
  importance: number;
  status: string;
  migrationRequired: boolean | null;
  uncertainty: string | null;
  project: { name: string; owner: string; repo: string };
};

export const EVENT_LABELS: Record<string, string> = {
  release: "Release", breaking_change: "Breaking change", deprecation: "Deprecation", security: "Security",
  api_change: "API change", documentation: "Documentation", performance: "Performance", ecosystem: "Ecosystem",
};

export function eventTypeLabel(type: string): string { return EVENT_LABELS[type] ?? type; }
export function importanceLabel(value: number): string { return value >= 80 ? "High" : value >= 50 ? "Medium" : "Low"; }
export function radarQuery(filters: { status?: string; projectId?: string; importance?: string }): string {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.projectId) params.set("projectId", filters.projectId);
  if (filters.importance) params.set("importance", filters.importance);
  const query = params.toString();
  return query ? `?${query}` : "";
}

