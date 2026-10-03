import type { ChangeBrief, ChangeEvent, Evidence, SourceRecord } from "../types.ts";

const MIGRATION_TYPES = new Set<ChangeEvent["eventType"]>(["breaking_change", "deprecation", "api_change"]);
const ARRAY_KEYS = ["affectedUsers", "risks", "relatedConcepts"] as const;
const MIGRATION_MARKER = /\b(?:migration(?:s)?|migrate|migrating|upgrade required|manual upgrade|major version)\b/i;
const MAX_EXCERPT = 1000;

/**
 * Build a brief from retained snapshots only. This function deliberately has no provider or model
 * dependency: a missing snapshot is represented as uncertainty instead of being filled with a guess.
 */
export async function generateChangeBrief(event: ChangeEvent, evidence: SourceRecord[]): Promise<ChangeBrief> {
  const usable = evidence.filter((source) => source.status === "ok" && source.url.trim().length > 0);
  const hasFailedEvidence = evidence.some((source) => source.status !== "ok" || source.url.trim().length === 0);
  const generatedAt = new Date().toISOString();

  if (usable.length === 0) {
    return {
      eventId: event.id, whatChanged: "", whyItMatters: "", affectedUsers: [], migrationRequired: null,
      beforeAfter: [], risks: [], relatedConcepts: [], evidence: [], generatedAt, modelVersion: null,
      status: "failed", uncertainty: "No usable source snapshot is available for this change.",
    };
  }

  // The event title is the normalized claim; source excerpts remain separately labeled evidence.
  const whatChanged = event.title.trim();
  const whyItMatters = consequenceFor(event.eventType);
  const facts: Evidence[] = usable.map((source) => ({
    sourceId: source.id,
    kind: "fact",
    excerpt: excerptOf(source),
    url: source.url,
  }));
  // The consequence is intentionally marked as an explanation, rather than presented as a source fact.
  facts.push({ sourceId: usable[0]!.id, kind: "explanation", excerpt: whyItMatters, url: usable[0]!.url });

  const migrationSignal = hasMigrationSignal(event, usable);
  const explicitMigrationMarker = hasExplicitMigrationMarker(usable);
  const migrationRequired = event.changeStatus === "disputed"
    ? explicitMigrationMarker ? true : null
    : MIGRATION_TYPES.has(event.eventType) ? migrationSignal : false;
  const status = event.changeStatus === "disputed" || hasFailedEvidence ? "uncertain" : "ready";
  const uncertainty = status === "ready" ? null : event.uncertainty ?? "Evidence is incomplete or the event is disputed; verify the source snapshots before acting.";

  return {
    eventId: event.id,
    whatChanged,
    whyItMatters,
    affectedUsers: metadataStrings(usable, "affectedUsers"),
    migrationRequired,
    beforeAfter: beforeAfterOf(usable),
    risks: metadataStrings(usable, "risks"),
    relatedConcepts: metadataStrings(usable, "relatedConcepts"),
    evidence: facts,
    generatedAt,
    modelVersion: null,
    status,
    uncertainty,
  };
}

function consequenceFor(eventType: ChangeEvent["eventType"]): string {
  switch (eventType) {
    case "security": return "Review exposure and affected security boundaries.";
    case "breaking_change":
    case "deprecation":
    case "api_change": return "Check the migration path before upgrading.";
    case "performance": return "Evaluate behavior against your workload.";
    case "release":
    case "documentation":
    case "ecosystem": return "Read the source to understand the change.";
  }
}

function metadataStrings(sources: SourceRecord[], key: (typeof ARRAY_KEYS)[number]): string[] {
  const result: string[] = [];
  for (const source of sources) {
    const value = source.metadata[key];
    if (!Array.isArray(value)) continue;
    for (const item of value) if (typeof item === "string" && item.trim() && !result.includes(item)) result.push(item);
  }
  return result;
}

function beforeAfterOf(sources: SourceRecord[]): ChangeBrief["beforeAfter"] {
  const result: ChangeBrief["beforeAfter"] = [];
  for (const source of sources) {
    const metadata = source.metadata;
    if (typeof metadata.before !== "string" || !metadata.before.trim() || typeof metadata.after !== "string" || !metadata.after.trim()) continue;
    result.push({
      before: metadata.before,
      after: metadata.after,
      language: typeof metadata.language === "string" && metadata.language.trim() ? metadata.language : null,
      sourceIds: [source.id],
    });
  }
  return result;
}

function hasMigrationSignal(event: ChangeEvent, sources: SourceRecord[]): boolean {
  if (event.changeStatus === "disputed") return sources.some((source) => {
    const metadata = source.metadata;
    if (metadata.migrationRequired === true || (typeof metadata.migrationMarker === "string" && metadata.migrationMarker.trim())) return true;
    return MIGRATION_MARKER.test(sourceText(source));
  });
  if (Boolean(event.versionFrom && event.versionTo)) return true;
  if (MIGRATION_MARKER.test(event.title)) return true;
  return sources.some((source) => {
    const metadata = source.metadata;
    if (metadata.migrationRequired === true || (typeof metadata.migrationMarker === "string" && metadata.migrationMarker.trim())) return true;
    if (source.versionFrom && source.versionTo) return true;
    return MIGRATION_MARKER.test(sourceText(source));
  });
}

function hasExplicitMigrationMarker(sources: SourceRecord[]): boolean {
  return sources.some((source) => {
    const metadata = source.metadata;
    if (metadata.migrationRequired === true || (typeof metadata.migrationMarker === "string" && metadata.migrationMarker.trim())) return true;
    return MIGRATION_MARKER.test(sourceText(source));
  });
}

function excerptOf(source: SourceRecord): string {
  const metadata = source.metadata;
  const preferred = [metadata.excerpt, metadata.summary, metadata.body, metadata.description, metadata.title]
    .find((value): value is string => typeof value === "string" && value.trim().length > 0);
  const raw = preferred ?? rawText(source);
  return truncate(raw);
}

function sourceText(source: SourceRecord): string {
  return [source.rawContent ?? "", ...Object.values(source.metadata).filter((value): value is string => typeof value === "string")].join(" ");
}

function rawText(source: SourceRecord): string {
  if (!source.rawContent) return "";
  try {
    const parsed: unknown = JSON.parse(source.rawContent);
    if (parsed && typeof parsed === "object") {
      const item = parsed as Record<string, unknown>;
      const value = [item.body, item.description, item.message, item.name, item.title]
        .find((candidate): candidate is string => typeof candidate === "string" && candidate.trim().length > 0);
      if (value) return value;
    }
  } catch { /* Plain text snapshots are valid evidence. */ }
  return source.rawContent;
}

function truncate(value: string): string {
  const text = value.trim();
  return text.length <= MAX_EXCERPT ? text : `${text.slice(0, MAX_EXCERPT - 1).trimEnd()}…`;
}
