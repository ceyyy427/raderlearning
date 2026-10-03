export * from "./types.ts";
export * from "./sources/source-adapter.ts";
export * from "./sources/github-adapter.ts";
export * from "./sources/docs-adapter.ts";
export * from "./changes/deduplicate.ts";
export * from "./changes/classify.ts";
export * from "./changes/cluster.ts";
export * from "./changes/importance.ts";
export * from "./briefs/change-brief.ts";
export * from "./learning/tasks.ts";
export * from "./briefs/change-brief.ts";
export * from "./learning/tasks.ts";

const CHANGE_EVENT_TYPES = new Set<string>([
  "release", "breaking_change", "deprecation", "security",
  "api_change", "documentation", "performance", "ecosystem",
]);
const SOURCE_TYPES = new Set<string>([
  "github_release", "github_issue", "github_pull_request", "official_documentation", "changelog",
]);

export function isChangeEventType(value: string): value is import("./types.ts").ChangeEventType {
  return CHANGE_EVENT_TYPES.has(value);
}

export function isSourceType(value: string): value is import("./types.ts").SourceType {
  return SOURCE_TYPES.has(value);
}
