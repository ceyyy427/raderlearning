import type { NormalizedSource } from "../types.ts";

/**
 * Return the first snapshot for each retrieval identity. Successful snapshots are
 * preferred over failures even when the failed attempt appeared first in input.
 */
export function deduplicateSources(records: NormalizedSource[]): NormalizedSource[] {
  const successfulBases = new Set(records.filter((record) => record.status === "ok").map(baseIdentity));
  const successfulSourceUrls = new Set(records.filter((record) => record.status === "ok").map(sourceUrlIdentity));
  const seen = new Set<string>();
  const retained: NormalizedSource[] = [];

  for (const record of records) {
    const identity = sourceIdentity(record);
    // A failed fetch is only useful when no successful fetch exists for the same
    // project/source identity. This also makes the result independent of fetch order.
    if (record.status === "failed" && (successfulBases.has(baseIdentity(record)) || successfulSourceUrls.has(sourceUrlIdentity(record)))) continue;
    if (seen.has(identity)) continue;
    seen.add(identity);
    retained.push(record);
  }
  return retained;
}

function sourceIdentity(record: NormalizedSource): string {
  if (record.contentHash) return `${record.projectId}\0${record.canonicalUrl}\0${record.contentHash}`;
  return `${baseIdentity(record)}`;
}

function baseIdentity(record: NormalizedSource): string {
  return `${record.projectId}\0${record.canonicalUrl}\0${record.providerId ?? ""}\0${record.sourceType}`;
}

function sourceUrlIdentity(record: NormalizedSource): string {
  return `${record.projectId}\0${record.canonicalUrl}`;
}
