import { GitHubAdapter, DocsAdapter, type SourceFetcher, type Project, type WatchRules, type SourceRecord } from "@aihot/developer-domain";
import { guardedFetch } from "../lib/http-fetch.ts";
import { credential } from "../config.ts";
import { sql, type Db } from "../db.ts";

/** Backend-only SourceFetcher. All developer source requests retain the existing SSRF/egress limits. */
export const guardedSourceFetcher: SourceFetcher = {
  async fetch(url, options) {
    const response = await guardedFetch(url, { headers: options?.headers, timeoutMs: options?.timeoutMs ?? 25_000, maxBytes: 8 * 1024 * 1024 });
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => { headers[key] = value; });
    return { status: response.status, headers, body: response.text() };
  },
};

type DeveloperProjectRow = {
  id: string; provider: "github"; owner: string; repo: string; name: string; description: string | null;
  default_branch: string | null; language: string | null; topics: unknown; watch_rules: unknown; status: Project["status"];
  last_synced_at: Date | string | null;
};

function bool(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function projectFromRow(row: DeveloperProjectRow): Project & { documentationUrl?: string; changelogUrl?: string } {
  const input = row.watch_rules && typeof row.watch_rules === "object" ? row.watch_rules as Record<string, unknown> : {};
  const watchRules: WatchRules = {
    releases: bool(input.releases ?? input.watch_releases),
    issues: bool(input.issues ?? input.watch_issues),
    pullRequests: bool(input.pullRequests ?? input.pull_requests ?? input.watch_pull_requests),
    documentation: bool(input.documentation ?? input.watch_documentation),
    changelog: bool(input.changelog ?? input.watch_changelog),
    keywords: Array.isArray(input.keywords) ? input.keywords.filter((value): value is string => typeof value === "string") : [],
  };
  const topics = Array.isArray(row.topics) ? row.topics.filter((value): value is string => typeof value === "string") : [];
  const result: Project & { documentationUrl?: string; changelogUrl?: string } = {
    id: row.id, provider: row.provider, owner: row.owner, repo: row.repo, name: row.name, description: row.description,
    defaultBranch: row.default_branch, language: row.language, topics, watchRules, status: row.status,
    lastSyncedAt: row.last_synced_at ? new Date(row.last_synced_at).toISOString() : null,
  };
  if (typeof input.documentationUrl === "string") result.documentationUrl = input.documentationUrl;
  if (typeof input.documentation_url === "string") result.documentationUrl = input.documentation_url;
  if (typeof input.changelogUrl === "string") result.changelogUrl = input.changelogUrl;
  if (typeof input.changelog_url === "string") result.changelogUrl = input.changelog_url;
  return result;
}

async function insertSnapshot(tx: Db, record: SourceRecord): Promise<void> {
  await tx`
    INSERT INTO developer_source_snapshots
      (id, project_id, source_type, provider_id, url, canonical_url, fetched_at, published_at, content_hash, raw_content, version_from, version_to, status, error, metadata)
    VALUES
      (${record.id}, ${record.projectId}, ${record.sourceType}, ${record.providerId}, ${record.url}, ${record.canonicalUrl}, ${record.fetchedAt}, ${record.publishedAt}, ${record.contentHash}, ${record.rawContent}, ${record.versionFrom}, ${record.versionTo}, ${record.status}, ${record.error}, ${sql.json(record.metadata as never)})
    ON CONFLICT (project_id, canonical_url, content_hash) DO NOTHING
  `;
}

export async function syncDeveloperProject(projectId: string, fetcher: SourceFetcher = guardedSourceFetcher): Promise<{ projectId: string; status: "ok" | "failed" | "skipped"; fetched: number; failed: number }> {
  const rows = await sql<DeveloperProjectRow[]>`SELECT id, provider, owner, repo, name, description, default_branch, language, topics, watch_rules, status, last_synced_at FROM developer_projects WHERE id = ${projectId} LIMIT 1`;
  const row = rows[0];
  if (!row) return { projectId, status: "skipped", fetched: 0, failed: 0 };
  const project = projectFromRow(row);
  const github = new GitHubAdapter(fetcher, { token: credential("collectors", "GITHUB_TOKEN") });
  const docs = new DocsAdapter(fetcher, {
    documentationUrl: project.watchRules.documentation ? project.documentationUrl : undefined,
    changelogUrl: project.watchRules.changelog ? project.changelogUrl : undefined,
  });
  const records = [...await github.fetchProject(project), ...await docs.fetchProject(project)];
  await sql.begin(async (tx) => {
    for (const record of records) await insertSnapshot(tx, record);
    await tx`UPDATE developer_projects SET last_synced_at = now(), updated_at = now() WHERE id = ${projectId}`;
  });
  const failed = records.filter((record) => record.status === "failed").length;
  return { projectId, status: failed ? "failed" : "ok", fetched: records.length, failed };
}
