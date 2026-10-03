import type { Project, NormalizedSource, SourceRecord, SourceType } from "../types.ts";
import { canonicalSourceUrl, contentHash, firstCodePoints, markdownOrHtmlHeading, newSourceId, type SourceAdapter, type SourceFetcher } from "./source-adapter.ts";

type GithubAdapterOptions = { token?: string | null };

export class GitHubAdapter implements SourceAdapter {
  private readonly fetcher: SourceFetcher;
  private readonly options: GithubAdapterOptions;
  constructor(fetcher: SourceFetcher, options: GithubAdapterOptions | string | null = {}) {
    this.fetcher = fetcher;
    this.options = typeof options === "string" ? { token: options } : options ?? {};
  }

  async fetchProject(project: Project): Promise<SourceRecord[]> {
    const records: SourceRecord[] = [];
    const base = `https://api.github.com/repos/${encodeURIComponent(project.owner)}/${encodeURIComponent(project.repo)}`;
    const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
    if (this.options.token) headers.Authorization = `Bearer ${this.options.token}`;
    if (project.watchRules.releases) records.push(...await this.fetchEndpoint(project, `${base}/releases?per_page=30`, "github_release", headers));
    if (project.watchRules.issues || project.watchRules.pullRequests) {
      const issues = await this.fetchIssues(project, `${base}/issues?state=all&per_page=30`, headers);
      records.push(...issues);
    }
    return records;
  }

  private async fetchIssues(project: Project, url: string, headers: Record<string, string>): Promise<SourceRecord[]> {
    try {
      const response = await this.fetcher.fetch(url, { headers, timeoutMs: 25_000 });
      if (response.status < 200 || response.status >= 300) return this.failedForEnabled(project, url, "github_issue", `GitHub returned HTTP ${response.status}`, headers);
      let items: unknown;
      try { items = JSON.parse(response.body); } catch { return this.failedForEnabled(project, url, "github_issue", "GitHub returned invalid JSON", headers); }
      if (!Array.isArray(items)) return this.failedForEnabled(project, url, "github_issue", "GitHub returned a non-array response", headers);
      const result: SourceRecord[] = [];
      for (const value of items.slice(0, 30)) {
        if (!value || typeof value !== "object") continue;
        const item = value as Record<string, unknown>;
        const isPr = Boolean(item.pull_request);
        if (isPr && !project.watchRules.pullRequests) continue;
        if (!isPr && !project.watchRules.issues) continue;
        result.push(this.recordFromItem(project, isPr ? "github_pull_request" : "github_issue", item, url));
      }
      return result;
    } catch (error) {
      return this.failedForEnabled(project, url, "github_issue", error instanceof Error ? error.message : String(error), headers);
    }
  }

  private async fetchEndpoint(project: Project, url: string, sourceType: SourceType, headers: Record<string, string>): Promise<SourceRecord[]> {
    try {
      const response = await this.fetcher.fetch(url, { headers, timeoutMs: 25_000 });
      if (response.status < 200 || response.status >= 300) return [this.failedRecord(project, sourceType, url, `GitHub returned HTTP ${response.status}`)];
      let items: unknown;
      try { items = JSON.parse(response.body); } catch { return [this.failedRecord(project, sourceType, url, "GitHub returned invalid JSON")]; }
      if (!Array.isArray(items)) return [this.failedRecord(project, sourceType, url, "GitHub returned a non-array response")];
      return items.slice(0, 30)
        .filter((value): value is Record<string, unknown> => Boolean(value && typeof value === "object"))
        .map((item) => this.recordFromItem(project, sourceType, item, url));
    } catch (error) {
      return [this.failedRecord(project, sourceType, url, error instanceof Error ? error.message : String(error))];
    }
  }

  private failedForEnabled(project: Project, url: string, sourceType: SourceType, error: string, _headers: Record<string, string>): SourceRecord[] {
    const result: SourceRecord[] = [];
    if (project.watchRules.issues) result.push(this.failedRecord(project, "github_issue", url, error));
    if (project.watchRules.pullRequests) result.push(this.failedRecord(project, "github_pull_request", url, error));
    return result.length ? result : [this.failedRecord(project, sourceType, url, error)];
  }

  private recordFromItem(project: Project, sourceType: SourceType, item: Record<string, unknown>, endpointUrl: string): SourceRecord {
    const providerId = githubProviderId(item.id);
    if (!providerId) return this.failedRecord(project, sourceType, endpointUrl, "GitHub item has a missing or invalid numeric id");
    if (typeof item.html_url !== "string" || !isHttpUrl(item.html_url)) return this.failedRecord(project, sourceType, endpointUrl, "GitHub item has a missing or invalid html_url");
    return this.successRecord(project, sourceType, item, providerId, item.html_url);
  }

  private successRecord(project: Project, sourceType: SourceType, item: Record<string, unknown>, providerId: string, url: string): SourceRecord {
    const rawContent = JSON.stringify(item);
    const publication = sourceType === "github_release" ? item.published_at : item.created_at;
    const publishedAt = typeof publication === "string" && !Number.isNaN(Date.parse(publication)) ? publication : null;
    const versionTo = sourceType === "github_release" && typeof item.tag_name === "string" ? item.tag_name : null;
    const versionFrom = sourceType === "github_release" && typeof item.target_commitish === "string" && item.target_commitish ? item.target_commitish : null;
    const metadata: Record<string, unknown> = {};
    if (typeof item.name === "string") metadata.title = item.name;
    else if (typeof item.title === "string") metadata.title = item.title;
    return {
      id: newSourceId(), projectId: project.id, sourceType, providerId,
      url, canonicalUrl: canonicalSourceUrl(url), fetchedAt: new Date().toISOString(), publishedAt, contentHash: contentHash(rawContent), rawContent,
      versionFrom, versionTo, status: "ok", error: null,
      metadata,
    };
  }

  private failedRecord(project: Project, sourceType: SourceType, url: string, error: string): SourceRecord {
    return { id: newSourceId(), projectId: project.id, sourceType, providerId: null, url, canonicalUrl: canonicalSourceUrl(url), fetchedAt: new Date().toISOString(), publishedAt: null, contentHash: null, rawContent: null, versionFrom: null, versionTo: null, status: "failed", error, metadata: {} };
  }

  normalize(record: SourceRecord): NormalizedSource {
    let source: Record<string, unknown> = {};
    if (record.rawContent && record.sourceType.startsWith("github_")) {
      try { const parsed = JSON.parse(record.rawContent); if (parsed && typeof parsed === "object") source = parsed as Record<string, unknown>; } catch { /* preserve raw content */ }
    }
    const title = typeof record.metadata.title === "string" && record.metadata.title
      ? record.metadata.title
      : typeof source.name === "string" ? source.name
      : typeof source.title === "string" ? source.title
      : markdownOrHtmlHeading(record.rawContent ?? "") ?? "";
    const content = typeof source.body === "string" ? source.body : typeof source.description === "string" ? source.description : record.rawContent ?? "";
    const tags = [record.sourceType === "github_release" ? "release" : record.sourceType === "github_issue" ? "issue" : record.sourceType === "github_pull_request" ? "pull_request" : record.sourceType === "official_documentation" ? "documentation" : "changelog"];
    if (record.versionTo) tags.push(`version:${record.versionTo}`);
    return { ...record, title, content, summary: firstCodePoints(content), tags };
  }
}

function githubProviderId(value: unknown): string | null {
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) return String(value);
  if (typeof value === "string" && /^\d+$/.test(value) && Number(value) > 0) return value;
  return null;
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
