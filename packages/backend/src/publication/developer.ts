import { createLearningTask, generateChangeBrief, type ChangeBrief, type ChangeEvent, type ChangeEventType, type ChangeStatus, type LearningTask, type NormalizedSource, type Project, type SourceRecord, type WatchRules } from "@aihot/developer-domain";
import { sql } from "../db.ts";
import { enqueue, QUEUES } from "../jobs/queue.ts";

export type ProjectSummary = Pick<Project, "id" | "provider" | "owner" | "repo" | "name" | "description" | "status" | "lastSyncedAt" | "watchRules"> & {
  defaultBranch: string | null;
  language: string | null;
  topics: string[];
};

export type CreateProjectInput = {
  owner: string;
  repo: string;
  name?: string;
  description?: string | null;
  watchRules?: Partial<WatchRules>;
};

export type RadarEvent = {
  id: string;
  projectId: string;
  eventType: ChangeEventType;
  title: string;
  sourceUrl: string;
  supportingSourceIds: string[];
  publishedAt: string | null;
  detectedAt: string;
  versionFrom: string | null;
  versionTo: string | null;
  importance: number;
  status: ChangeStatus;
  uncertainty: string | null;
  migrationRequired: boolean | null;
  project: ProjectSummary;
};

export type RadarResponse = { events: RadarEvent[]; projects: ProjectSummary[]; asOf: string };

export type DeveloperSourceDetail = Pick<SourceRecord, "id" | "projectId" | "sourceType" | "providerId" | "url" | "canonicalUrl" | "fetchedAt" | "publishedAt" | "contentHash" | "rawContent" | "versionFrom" | "versionTo" | "status" | "error" | "metadata">;
export type ChangeDetail = { event: RadarEvent; project: ProjectSummary; sources: DeveloperSourceDetail[] };
export type DeveloperBrief = { brief: ChangeBrief; task: LearningTask };

const DEFAULT_WATCH_RULES: WatchRules = { releases: true, issues: true, pullRequests: true, changelog: true, documentation: false, keywords: [] };
const GITHUB_PART = /^[A-Za-z0-9](?:[A-Za-z0-9_.-]{0,98}[A-Za-z0-9])?$/;
const EVENT_MIGRATION_TYPES = new Set<ChangeEventType>(["breaking_change", "deprecation", "api_change"]);

type ProjectRow = {
  id: string; provider: "github"; owner: string; repo: string; name: string; description: string | null;
  default_branch: string | null; language: string | null; topics: unknown; watch_rules: unknown; status: Project["status"];
  last_synced_at: Date | string | null;
};
type EventRow = {
  id: string; project_id: string; event_type: ChangeEventType; title: string; source_url: string;
  supporting_source_ids: string[]; published_at: Date | string | null; detected_at: Date | string;
  version_from: string | null; version_to: string | null; importance: number; change_status: ChangeStatus; uncertainty: string | null;
  project: ProjectRow;
};

function iso(value: Date | string | null): string | null { return value == null ? null : new Date(value).toISOString(); }
function textArray(value: unknown): string[] { return Array.isArray(value) ? value.filter((x): x is string => typeof x === "string") : []; }
function watchRules(value: unknown): WatchRules {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    releases: typeof input.releases === "boolean" ? input.releases : DEFAULT_WATCH_RULES.releases,
    issues: typeof input.issues === "boolean" ? input.issues : DEFAULT_WATCH_RULES.issues,
    pullRequests: typeof input.pullRequests === "boolean" ? input.pullRequests : DEFAULT_WATCH_RULES.pullRequests,
    documentation: typeof input.documentation === "boolean" ? input.documentation : DEFAULT_WATCH_RULES.documentation,
    changelog: typeof input.changelog === "boolean" ? input.changelog : DEFAULT_WATCH_RULES.changelog,
    keywords: textArray(input.keywords),
  };
}
function projectFromRow(row: ProjectRow): ProjectSummary {
  return { id: row.id, provider: row.provider, owner: row.owner, repo: row.repo, name: row.name, description: row.description,
    defaultBranch: row.default_branch, language: row.language, topics: textArray(row.topics), watchRules: watchRules(row.watch_rules), status: row.status, lastSyncedAt: iso(row.last_synced_at) };
}
function migrationRequired(row: Pick<EventRow, "event_type" | "version_from" | "version_to" | "change_status" | "uncertainty" | "supporting_source_ids">): boolean | null {
  if (row.change_status === "disputed") return row.uncertainty || row.version_from || row.version_to || row.supporting_source_ids.length > 0 ? true : null;
  return EVENT_MIGRATION_TYPES.has(row.event_type) ? Boolean(row.version_from || row.version_to) : false;
}
function eventFromRow(row: EventRow): RadarEvent {
  return { id: row.id, projectId: row.project_id, eventType: row.event_type, title: row.title, sourceUrl: row.source_url,
    supportingSourceIds: row.supporting_source_ids ?? [], publishedAt: iso(row.published_at), detectedAt: iso(row.detected_at)!, versionFrom: row.version_from,
    versionTo: row.version_to, importance: row.importance, status: row.change_status, uncertainty: row.uncertainty,
    migrationRequired: migrationRequired(row), project: projectFromRow(row.project) };
}

function validateInput(input: CreateProjectInput): { owner: string; repo: string } {
  const owner = input.owner.trim();
  const repo = input.repo.trim();
  if (!GITHUB_PART.test(owner) || !GITHUB_PART.test(repo) || owner === "." || owner === ".." || repo === "." || repo === "..") throw new Error("owner and repo must be safe GitHub path components");
  return { owner, repo };
}

export async function listDeveloperProjects(): Promise<ProjectSummary[]> {
  const rows = await sql<ProjectRow[]>`SELECT id, provider, owner, repo, name, description, default_branch, language, topics, watch_rules, status, last_synced_at FROM developer_projects ORDER BY name ASC, id ASC`;
  return rows.map(projectFromRow);
}

export async function createDeveloperProject(input: CreateProjectInput): Promise<ProjectSummary> {
  const { owner, repo } = validateInput(input);
  const id = `github:${owner}/${repo}`;
  const name = input.name?.trim() || repo;
  const hasName = input.name !== undefined;
  const hasWatchRules = input.watchRules !== undefined;
  if (name.length > 200) throw new Error("name is too long");
  const rules: WatchRules = { ...DEFAULT_WATCH_RULES, ...(input.watchRules ?? {}), keywords: input.watchRules?.keywords ?? DEFAULT_WATCH_RULES.keywords };
  const rows = await sql<ProjectRow[]>`
    INSERT INTO developer_projects (id, provider, owner, repo, name, description, watch_rules)
    VALUES (${id}, 'github', ${owner}, ${repo}, ${name}, ${input.description ?? null}, ${sql.json(rules as never)})
    ON CONFLICT (id) DO UPDATE SET owner = EXCLUDED.owner, repo = EXCLUDED.repo,
      name = CASE WHEN ${hasName} THEN EXCLUDED.name ELSE developer_projects.name END,
      description = COALESCE(EXCLUDED.description, developer_projects.description),
      watch_rules = CASE WHEN ${hasWatchRules} THEN EXCLUDED.watch_rules ELSE developer_projects.watch_rules END, updated_at = now()
    RETURNING id, provider, owner, repo, name, description, default_branch, language, topics, watch_rules, status, last_synced_at
  `;
  return projectFromRow(rows[0]!);
}

export async function enqueueDeveloperProjectSync(id: string): Promise<{ projectId: string; queued: boolean }> {
  const exists = await sql<{ id: string }[]>`SELECT id FROM developer_projects WHERE id = ${id} LIMIT 1`;
  if (!exists[0]) throw new Error("project_not_found");
  const job = await enqueue(QUEUES.developerSync, { projectId: id }, { singletonKey: `developer:${id}` });
  return { projectId: id, queued: job !== null };
}

async function radarRows(status?: ChangeStatus, projectId?: string, importance?: number): Promise<EventRow[]> {
  const conditions = [sql`TRUE`];
  if (status) conditions.push(sql`e.change_status = ${status}`);
  if (projectId) conditions.push(sql`e.project_id = ${projectId}`);
  if (importance !== undefined) conditions.push(sql`e.importance >= ${importance}`);
  const where = conditions.slice(1).reduce((query, condition) => sql`${query} AND ${condition}`, conditions[0]!);
  return sql<EventRow[]>`
    SELECT e.id, e.project_id, e.event_type, e.title, e.source_url, e.supporting_source_ids, e.published_at, e.detected_at,
      e.version_from, e.version_to, e.importance, e.change_status, e.uncertainty,
      jsonb_build_object('id', p.id, 'provider', p.provider, 'owner', p.owner, 'repo', p.repo, 'name', p.name,
        'description', p.description, 'default_branch', p.default_branch, 'language', p.language, 'topics', p.topics,
        'watch_rules', p.watch_rules, 'status', p.status, 'last_synced_at', p.last_synced_at)::jsonb AS project
    FROM developer_change_events e JOIN developer_projects p ON p.id = e.project_id
    WHERE ${where}
    ORDER BY e.importance DESC, e.detected_at DESC, e.id ASC
  `;
}

export async function listRadar(input: { status?: ChangeStatus; projectId?: string; importance?: number }): Promise<RadarResponse> {
  const rows = await radarRows(input.status, input.projectId, input.importance);
  const projects = await listDeveloperProjects();
  return { events: rows.map(eventFromRow), projects, asOf: new Date().toISOString() };
}

function sourceFromRow(row: Record<string, unknown>): DeveloperSourceDetail {
  return { id: String(row.id), projectId: String(row.project_id), sourceType: row.source_type as SourceRecord["sourceType"], providerId: row.provider_id as string | null,
    url: String(row.url), canonicalUrl: String(row.canonical_url), fetchedAt: iso(row.fetched_at as Date | string)!, publishedAt: iso(row.published_at as Date | string | null),
    contentHash: row.content_hash as string | null, rawContent: row.raw_content as string | null, versionFrom: row.version_from as string | null, versionTo: row.version_to as string | null,
    status: row.status as SourceRecord["status"], error: row.error as string | null, metadata: (row.metadata && typeof row.metadata === "object" ? row.metadata : {}) as Record<string, unknown> };
}

export async function getDeveloperChange(id: string): Promise<ChangeDetail | null> {
  const rows = await sql<EventRow[]>`
    SELECT e.id, e.project_id, e.event_type, e.title, e.source_url, e.supporting_source_ids, e.published_at, e.detected_at,
      e.version_from, e.version_to, e.importance, e.change_status, e.uncertainty,
      jsonb_build_object('id', p.id, 'provider', p.provider, 'owner', p.owner, 'repo', p.repo, 'name', p.name,
        'description', p.description, 'default_branch', p.default_branch, 'language', p.language, 'topics', p.topics,
        'watch_rules', p.watch_rules, 'status', p.status, 'last_synced_at', p.last_synced_at)::jsonb AS project
    FROM developer_change_events e JOIN developer_projects p ON p.id = e.project_id WHERE e.id = ${id} LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;
  const sourceIds = row.supporting_source_ids ?? [];
  const sources = await sql<Record<string, unknown>[]>`
    SELECT id, project_id, source_type, provider_id, url, canonical_url, fetched_at, published_at, content_hash, raw_content,
      version_from, version_to, status, error, metadata
    FROM developer_source_snapshots
    WHERE project_id = ${row.project_id} AND (url = ${row.source_url} OR id = ANY(${sourceIds}::text[]))
    ORDER BY fetched_at ASC, id ASC
  `;
  const event = eventFromRow(row);
  return { event, project: event.project, sources: sources.map(sourceFromRow) };
}

function asChangeEvent(detail: ChangeDetail): ChangeEvent {
  const { event } = detail;
  return { id: event.id, projectId: event.projectId, eventType: event.eventType, title: event.title, sourceUrl: event.sourceUrl,
    supportingSourceIds: event.supportingSourceIds, publishedAt: event.publishedAt, detectedAt: event.detectedAt, versionFrom: event.versionFrom,
    versionTo: event.versionTo, importance: event.importance, changeStatus: event.status, uncertainty: event.uncertainty };
}

function sourceRecord(source: DeveloperSourceDetail): NormalizedSource {
  return { ...source, title: typeof source.metadata.title === "string" ? source.metadata.title : "", summary: "", content: source.rawContent ?? "", tags: [] };
}

export async function getDeveloperBrief(id: string): Promise<DeveloperBrief | null> {
  const detail = await getDeveloperChange(id);
  if (!detail) return null;
  const event = asChangeEvent(detail);
  const brief = await generateChangeBrief(event, detail.sources.map(sourceRecord));
  const task = createLearningTask(brief);
  await sql.begin(async (tx) => {
    await tx`
      INSERT INTO developer_change_briefs (event_id, what_changed, why_it_matters, affected_users, migration_required, before_after, risks, related_concepts, evidence, generated_at, model_version, status, uncertainty)
      VALUES (${brief.eventId}, ${brief.whatChanged}, ${brief.whyItMatters}, ${sql.json(brief.affectedUsers as never)}, ${brief.migrationRequired}, ${sql.json(brief.beforeAfter as never)}, ${sql.json(brief.risks as never)}, ${sql.json(brief.relatedConcepts as never)}, ${sql.json(brief.evidence as never)}, ${brief.generatedAt}, ${brief.modelVersion}, ${brief.status}, ${brief.uncertainty})
      ON CONFLICT (event_id) DO UPDATE SET what_changed = EXCLUDED.what_changed, why_it_matters = EXCLUDED.why_it_matters, affected_users = EXCLUDED.affected_users,
        migration_required = EXCLUDED.migration_required, before_after = EXCLUDED.before_after, risks = EXCLUDED.risks, related_concepts = EXCLUDED.related_concepts,
        evidence = EXCLUDED.evidence, generated_at = EXCLUDED.generated_at, model_version = EXCLUDED.model_version, status = EXCLUDED.status, uncertainty = EXCLUDED.uncertainty
    `;
    await tx`
      INSERT INTO developer_learning_tasks (id, event_id, task_type, question, starter_code, expected_concept, solution, difficulty)
      VALUES (${task.id}, ${task.eventId}, ${task.taskType}, ${task.question}, ${task.starterCode}, ${task.expectedConcept}, ${task.solution}, ${task.difficulty})
      ON CONFLICT (id) DO UPDATE SET question = EXCLUDED.question, expected_concept = EXCLUDED.expected_concept, solution = EXCLUDED.solution, difficulty = EXCLUDED.difficulty
    `;
  });
  return { brief, task };
}

// Narrow publication helpers keep callers from depending on the storage bundle shape.
export async function getDeveloperChangeBrief(id: string): Promise<ChangeBrief | null> {
  const result = await getDeveloperBrief(id);
  return result?.brief ?? null;
}

export async function getDeveloperLearningTask(id: string): Promise<LearningTask | null> {
  const result = await getDeveloperBrief(id);
  return result?.task ?? null;
}
