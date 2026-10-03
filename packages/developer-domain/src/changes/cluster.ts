import { createHash } from "node:crypto";
import type { ChangeEvent, NormalizedSource } from "../types.ts";
import { classifyChange, classificationPrecedence, sourceSearchText, titleTokens, versionMarkers } from "./classify.ts";

type Cluster = { records: NormalizedSource[] };

/** Cluster already-deduplicated records in their original order. */
export function clusterChanges(records: NormalizedSource[]): ChangeEvent[] {
  if (records.length === 0) return [];
  const clusters: Cluster[] = [];
  for (const record of records) {
    const match = clusters.find((cluster) => cluster.records.some((member) => canCluster(member, record)));
    if (match) match.records.push(record);
    else clusters.push({ records: [record] });
  }
  return clusters.map(toEvent);
}

function canCluster(left: NormalizedSource, right: NormalizedSource): boolean {
  if (left.projectId !== right.projectId) return false;
  if (left.versionTo && right.versionTo && normalizeVersion(left.versionTo) === normalizeVersion(right.versionTo)) return true;
  if (left.providerId && right.providerId && isGithub(left) && isGithub(right) && left.providerId === right.providerId) return true;

  const leftVersions = versionMarkers(left);
  const rightVersions = versionMarkers(right);
  const sameVersion = [...leftVersions].some((version) => rightVersions.has(version));
  const releaseAndRelated = sameVersion && (isRelease(left) && isChangelogOrPr(right) || isRelease(right) && isChangelogOrPr(left));
  if (releaseAndRelated) return true;

  const leftTitle = titleTokens(left);
  const rightTitle = titleTokens(right);
  const titleOverlap = [...leftTitle].filter((token) => rightTitle.has(token)).length;
  if (titleOverlap < 2) return false;
  const markerOverlap = sameVersion || [...sourceMarkers(left)].some((marker) => sourceMarkers(right).has(marker));
  return markerOverlap;
}

function toEvent(cluster: Cluster): ChangeEvent {
  const primary = cluster.records[0]!;
  const classifications = cluster.records.map((record) => classifyChange(record));
  const primaryClassification = classifications[0]!;
  const highestIndex = classifications.reduce((best, classification, index) => classificationPrecedence(classification.eventType) > classificationPrecedence(classifications[best]!.eventType) ? index : best, 0);
  const eventType = classifications[highestIndex]!.eventType;
  const conflicts: string[] = [];
  const versions = new Map<string, string[]>();
  for (const [index, record] of cluster.records.entries()) {
    if (record.versionTo) {
      const version = normalizeVersion(record.versionTo);
      const ids = versions.get(version) ?? [];
      ids.push(record.id);
      versions.set(version, ids);
    }
  }
  if (versions.size > 1) {
    conflicts.push(`version targets disagree across source IDs: ${[...versions.values()].flat().join(", ")}`);
  }
  const types = new Map<string, string[]>();
  for (const [index, classification] of classifications.entries()) {
    const ids = types.get(classification.eventType) ?? [];
    ids.push(cluster.records[index]!.id);
    types.set(classification.eventType, ids);
  }
  const typeConflict = (types.has("security") && types.has("release")) || (types.has("breaking_change") && types.has("documentation"));
  if (typeConflict) {
    conflicts.push(`conflicting classifications across source IDs: ${[...types.values()].flat().join(", ")}`);
  }
  const disputed = conflicts.length > 0;
  const sourceIds = cluster.records.map((record) => record.id);
  const id = `change-${createHash("sha256").update(`${primary.projectId}\0${sourceIds.join("\0")}`, "utf8").digest("hex").slice(0, 32)}`;
  return {
    id,
    projectId: primary.projectId,
    eventType,
    title: primary.title,
    sourceUrl: primary.url,
    supportingSourceIds: sourceIds.slice(1),
    publishedAt: primary.publishedAt,
    detectedAt: primary.fetchedAt,
    versionFrom: primary.versionFrom,
    versionTo: primary.versionTo,
    importance: 0,
    changeStatus: disputed ? "disputed" : primaryClassification.changeStatus,
    uncertainty: disputed ? conflicts.join("; ") : null,
  };
}

function normalizeVersion(value: string): string { return value.trim().toLowerCase().replace(/^v/, ""); }
function isGithub(record: NormalizedSource): boolean { return record.sourceType.startsWith("github_"); }
function isRelease(record: NormalizedSource): boolean { return record.sourceType === "github_release"; }
function isChangelogOrPr(record: NormalizedSource): boolean { return record.sourceType === "changelog" || record.sourceType === "github_pull_request"; }
function sourceMarkers(record: NormalizedSource): Set<string> {
  const text = sourceSearchText(record);
  return new Set((text.match(/\b(?:release|changelog|pull_request|issue|documentation|docs|security|breaking|deprecat\w*|api|performance|plugin|integration)\b/g) ?? []));
}
