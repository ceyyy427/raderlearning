import { createHash, randomUUID } from "node:crypto";
import type { NormalizedSource, Project, SourceRecord } from "../types.ts";

export interface SourceFetcher {
  fetch(url: string, options?: { headers?: Record<string, string>; timeoutMs?: number }): Promise<{
    status: number;
    headers: Record<string, string>;
    body: string;
  }>;
}

export interface SourceAdapter {
  fetchProject(project: Project): Promise<SourceRecord[]>;
  normalize(record: SourceRecord): NormalizedSource;
}

/** SHA-256 is intentionally over the exact body received from the source. */
export function contentHash(rawContent: string): string {
  return createHash("sha256").update(rawContent, "utf8").digest("hex");
}

// Keep this policy aligned with backend material identity. Query parameters that carry source,
// campaign, or session attribution must not split one source into multiple snapshots.
const TRACKING_PARAM = /^(utm_[a-z]+|spm|from|ref|ref_src|ref_url|source|share_source|share_token|fbclid|gclid|igshid|mc_cid|mc_eid|_hsenc|_hsmi|scene|chksm|sessionid|srcid|clicktime|enterid|mkt_tok)$/i;

/** Canonicalize only URL identity details; the source path and meaningful query remain intact. */
export function canonicalSourceUrl(input: string): string {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    // Failed configured endpoints still need an immutable, inspectable snapshot. Keep the
    // operator-provided value as a safe identity fallback when it is not a URL.
    return input.trim();
  }
  url.hash = "";
  if ((url.protocol === "http:" && url.port === "80") || (url.protocol === "https:" && url.port === "443")) url.port = "";
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAM.test(key)) url.searchParams.delete(key);
  }
  const pairs = [...url.searchParams.entries()].sort(([a, av], [b, bv]) => a === b ? av.localeCompare(bv) : a.localeCompare(b));
  url.search = "";
  for (const [key, value] of pairs) url.searchParams.append(key, value);
  return url.toString();
}

export function newSourceId(): string {
  return randomUUID();
}

/** Keep immutable history while de-duplicating successful re-fetches by URL and content hash. */
export function retainSnapshots(previous: SourceRecord[], incoming: SourceRecord[]): SourceRecord[] {
  const result = [...previous];
  const successful = new Set(previous.filter((record) => record.status === "ok" && record.contentHash).map((record) => `${record.canonicalUrl}\0${record.contentHash}`));
  for (const record of incoming) {
    if (record.status === "ok" && record.contentHash) {
      const key = `${record.canonicalUrl}\0${record.contentHash}`;
      if (successful.has(key)) continue;
      successful.add(key);
    }
    result.push(record);
  }
  return result;
}

export function firstCodePoints(value: string, max = 500): string {
  return Array.from(value).slice(0, max).join("");
}

export function markdownOrHtmlHeading(value: string): string | null {
  const markdown = value.match(/^\s{0,3}#\s+([^\n#]+?)\s*#?\s*$/m);
  if (markdown?.[1]) return markdown[1].trim();
  const html = value.match(/<h[1-6][^>]*>\s*([\s\S]*?)\s*<\/h[1-6]>/i);
  if (html?.[1]) return html[1].replace(/<[^>]+>/g, "").trim();
  return null;
}
