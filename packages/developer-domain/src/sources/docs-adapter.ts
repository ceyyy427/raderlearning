import type { NormalizedSource, Project, SourceRecord, SourceType } from "../types.ts";
import { canonicalSourceUrl, contentHash, firstCodePoints, markdownOrHtmlHeading, newSourceId, type SourceAdapter, type SourceFetcher } from "./source-adapter.ts";

export type DocumentationUrls = { documentationUrl?: string; changelogUrl?: string };

export class DocsAdapter implements SourceAdapter {
  private readonly fetcher: SourceFetcher;
  private readonly urls: DocumentationUrls;
  constructor(fetcher: SourceFetcher, urls: DocumentationUrls) {
    this.fetcher = fetcher;
    this.urls = urls;
  }

  async fetchProject(project: Project): Promise<SourceRecord[]> {
    const result: SourceRecord[] = [];
    if (project.watchRules.documentation && this.urls.documentationUrl) result.push(await this.fetchOne(project, "official_documentation", this.urls.documentationUrl));
    if (project.watchRules.changelog && this.urls.changelogUrl) result.push(await this.fetchOne(project, "changelog", this.urls.changelogUrl));
    return result;
  }

  private async fetchOne(project: Project, sourceType: SourceType, url: string): Promise<SourceRecord> {
    try {
      const response = await this.fetcher.fetch(url, { headers: { Accept: "text/html, text/markdown, application/xhtml+xml;q=0.9, */*;q=0.8" }, timeoutMs: 25_000 });
      if (response.status < 200 || response.status >= 300) return this.failedRecord(project, sourceType, url, `Source returned HTTP ${response.status}`);
      const rawContent = response.body;
      return { id: newSourceId(), projectId: project.id, sourceType, providerId: null, url, canonicalUrl: canonicalSourceUrl(url), fetchedAt: new Date().toISOString(), publishedAt: parsePublicationDate(rawContent), contentHash: contentHash(rawContent), rawContent, versionFrom: null, versionTo: null, status: "ok", error: null, metadata: {} };
    } catch (error) {
      return this.failedRecord(project, sourceType, url, error instanceof Error ? error.message : String(error));
    }
  }

  private failedRecord(project: Project, sourceType: SourceType, url: string, error: string): SourceRecord {
    return { id: newSourceId(), projectId: project.id, sourceType, providerId: null, url, canonicalUrl: canonicalSourceUrl(url), fetchedAt: new Date().toISOString(), publishedAt: null, contentHash: null, rawContent: null, versionFrom: null, versionTo: null, status: "failed", error, metadata: {} };
  }

  normalize(record: SourceRecord): NormalizedSource {
    const content = record.rawContent ?? "";
    const title = typeof record.metadata.title === "string" && record.metadata.title ? record.metadata.title : markdownOrHtmlHeading(content) ?? "";
    const tags = [record.sourceType === "official_documentation" ? "documentation" : "changelog"];
    if (record.versionTo) tags.push(`version:${record.versionTo}`);
    return { ...record, title, content, summary: firstCodePoints(content), tags };
  }
}

function parsePublicationDate(content: string): string | null {
  const candidates = [
    /<meta[^>]+(?:property|name)=["'](?:article:published_time|datepublished|date|publishdate)["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:article:published_time|datepublished|date|publishdate)["']/i,
    /<time[^>]+datetime=["']([^"']+)["']/i,
    /^date:\s*["']?([^\n"']+)["']?\s*$/im,
  ];
  for (const pattern of candidates) {
    const match = content.match(pattern);
    if (match?.[1] && !Number.isNaN(Date.parse(match[1]))) return new Date(match[1]).toISOString();
  }
  return null;
}
