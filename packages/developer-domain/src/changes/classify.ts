import type { ChangeClassification, NormalizedSource } from "../types.ts";

type Rule = { eventType: ChangeClassification["eventType"]; markers: readonly string[] };

// Keep this order in sync with the brief: the first matching family wins.
const RULES: readonly Rule[] = [
  { eventType: "security", markers: ["security", "vulnerability", "cve", "exploit", "credential", "secret", "auth bypass"] },
  { eventType: "breaking_change", markers: ["breaking change", "breaking", "incompatible", "removed", "major version", "migration required"] },
  { eventType: "deprecation", markers: ["deprecated", "deprecation", "sunset", "removed in"] },
  { eventType: "api_change", markers: ["api", "endpoint", "parameter", "schema", "default", "interface", "contract"] },
  { eventType: "performance", markers: ["performance", "latency", "throughput", "faster", "memory", "benchmark"] },
  { eventType: "documentation", markers: ["docs", "guide", "reference", "changelog"] },
  { eventType: "ecosystem", markers: ["plugin", "integration", "adapter", "ecosystem", "dependency", "compatibility"] },
];

const DOCUMENTATION_SOURCE_TYPES = new Set(["official_documentation", "documentation"]);
const MIGRATION_MARKER = /\b(?:migration(?:s)?|migrate|migrating|upgrade required|manual upgrade)\b/i;
const VERSION_TOKEN = /\bv?\d+(?:\.\d+){1,3}(?:[-+][0-9a-z.-]+)?\b/gi;
const MAJOR_VERSION_TEXT = /\bmajor\s+version\b/i;

/** Classify only source-grounded fields; no model or external lookup is involved. */
export function classifyChange(record: NormalizedSource): ChangeClassification {
  if (record.status === "failed") {
    return { eventType: "release", changeStatus: "failed", confidence: "low", reasons: [], migrationRequired: null };
  }

  const evidence = searchableEvidence(record);
  const documentationSource = DOCUMENTATION_SOURCE_TYPES.has(record.sourceType) || record.sourceType === "changelog";
  const matchingRules = RULES.map((rule) => ({
    rule,
    markers: rule.eventType === "documentation" && documentationSource
      ? [`sourceType: ${record.sourceType}`, ...rule.markers.filter((marker) => contains(evidence, marker))]
      : rule.markers.filter((marker) => contains(evidence, marker)),
  }))
    .filter(({ markers }) => markers.length > 0);

  const selected = matchingRules[0];
  if (!selected) {
    const isRelease = record.sourceType === "github_release";
    return {
      eventType: "release",
      changeStatus: "new",
      confidence: isRelease ? "medium" : "low",
      reasons: isRelease ? [`sourceType: ${record.sourceType}`] : [],
      migrationRequired: isRelease ? false : null,
    };
  }

  const reasons = selected.markers.map((marker) => marker.startsWith("sourceType:") ? marker : `marker: ${marker}`);
  const eventType = selected.rule.eventType;
  const migrationEvidence = MIGRATION_MARKER.test(evidence) || MAJOR_VERSION_TEXT.test(evidence) || majorVersionChanged(record);
  const migrationRequired = eventType === "breaking_change" || eventType === "deprecation" || eventType === "api_change"
    ? migrationEvidence
    : false;
  return { eventType, changeStatus: "new", confidence: "high", reasons, migrationRequired };
}

/** Internal helpers are exported for clustering without duplicating matching rules. */
export function sourceSearchText(record: NormalizedSource): string {
  return searchableEvidence(record);
}

export function versionMarkers(record: NormalizedSource): Set<string> {
  const text = searchableEvidence(record);
  const result = new Set<string>();
  for (const value of text.match(VERSION_TOKEN) ?? []) result.add(value.toLowerCase().replace(/^v/, ""));
  for (const tag of record.tags) {
    const match = tag.match(/^version:(.+)$/i);
    if (match?.[1]) result.add(match[1].toLowerCase().replace(/^v/, ""));
  }
  if (record.versionTo) result.add(record.versionTo.toLowerCase().replace(/^v/, ""));
  return result;
}

export function titleTokens(record: NormalizedSource): Set<string> {
  const stopWords = new Set(["a", "an", "and", "for", "from", "in", "of", "on", "the", "to", "with", "update", "updated"]);
  return new Set((record.title.toLowerCase().match(/[a-z0-9][a-z0-9._-]*/g) ?? []).filter((token) => token.length >= 2 && !stopWords.has(token)));
}

export function classificationPrecedence(eventType: ChangeClassification["eventType"]): number {
  if (eventType === "release") return 0;
  const index = RULES.findIndex((rule) => rule.eventType === eventType);
  return index < 0 ? 0 : RULES.length - index;
}

function searchableEvidence(record: NormalizedSource): string {
  return [record.sourceType, record.title, record.summary, record.content, ...record.tags, record.versionFrom ?? "", record.versionTo ?? ""].join(" ").toLowerCase();
}

function contains(text: string, marker: string): boolean {
  const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`, "i").test(text);
}

function majorVersionChanged(record: NormalizedSource): boolean {
  if (!record.versionFrom || !record.versionTo) return false;
  const from = record.versionFrom.match(/^v?(\d+)/i)?.[1];
  const to = record.versionTo.match(/^v?(\d+)/i)?.[1];
  return Boolean(from && to && from !== to);
}
