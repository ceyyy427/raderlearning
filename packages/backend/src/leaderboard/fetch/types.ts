// Upstream evaluation fetchers produce parsed rows; identity resolution and selection happen in store.ts.
import type { Configuration } from "./configuration.ts";

export interface ParsedRow {
  /** The source's own model name or id, kept verbatim (also the alias key). */
  sourceModelName: string;
  /** Name part of the configuration key (defaults to sourceModelName); some sources key by its slug. */
  keyName?: string;
  /** The whole stored configuration key, for sources that identify each run themselves (a submission file). */
  configurationKey?: string;
  /** Other names the source uses for the same row (display name vs slug), tried as aliases too. */
  altNames?: string[];
  /** Base model name without run descriptors, for resolving models the source introduces. */
  baseName: string;
  organization?: string | null;
  releasedAt?: string | null;
  configuration: Configuration;
  metricKey: string;
  metricName: string;
  rawScore: number;
  lowerBound?: number | null;
  upperBound?: number | null;
  sourceRank?: number | null;
  sampleSize?: number | null;
  sourcePublishedAt?: string | null;
  metadata?: Record<string, unknown>;
}

export interface FetchResult {
  sourceKey: string;
  sourceName: string;
  sourceUrl: string;
  license: string;
  attributionUrl: string;
  /** When the upstream data was published or last changed, if the source says. */
  publishedAt: string | null;
  rows: ParsedRow[];
  metadata: Record<string, unknown>;
}

export interface Fetcher {
  sourceKeys: string[];
  fetch(): Promise<FetchResult[]>;
}
