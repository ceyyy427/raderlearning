import type { ChangeEvent, Project } from "../types.ts";

const BASE: Record<ChangeEvent["eventType"], number> = {
  security: 95,
  breaking_change: 90,
  deprecation: 80,
  api_change: 75,
  performance: 65,
  release: 60,
  ecosystem: 50,
  documentation: 35,
};

export function scoreImportance(event: ChangeEvent, project: Project): number {
  let score = BASE[event.eventType];
  score += Math.min(10, event.supportingSourceIds.length * 2);
  if (event.versionFrom && event.versionTo && event.versionFrom !== event.versionTo) score += 5;
  const keywordMatch = project.watchRules.keywords.some((keyword) => keyword.trim() && matches(keyword.trim(), event.title, event.sourceUrl));
  if (keywordMatch) score += 5;
  if (event.eventType === "documentation" && !(project.watchRules.documentation && keywordMatch)) score -= 10;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function matches(keyword: string, title: string, url: string): boolean {
  const needle = keyword.toLocaleLowerCase();
  return title.toLocaleLowerCase().includes(needle) || url.toLocaleLowerCase().includes(needle);
}
