export type WatchRules = {
  releases: boolean;
  issues: boolean;
  pullRequests: boolean;
  documentation: boolean;
  changelog: boolean;
  keywords: string[];
};

export type Project = {
  id: string;
  provider: "github";
  owner: string;
  repo: string;
  name: string;
  description: string | null;
  defaultBranch: string | null;
  language: string | null;
  topics: string[];
  watchRules: WatchRules;
  status: "active" | "learning" | "watching" | "paused";
  lastSyncedAt: string | null;
};

export type SourceType =
  | "github_release"
  | "github_issue"
  | "github_pull_request"
  | "official_documentation"
  | "changelog";
export type SourceStatus = "pending" | "ok" | "failed";

export type SourceRecord = {
  id: string;
  projectId: string;
  sourceType: SourceType;
  providerId: string | null;
  url: string;
  canonicalUrl: string;
  fetchedAt: string;
  publishedAt: string | null;
  contentHash: string | null;
  rawContent: string | null;
  versionFrom: string | null;
  versionTo: string | null;
  status: SourceStatus;
  error: string | null;
  metadata: Record<string, unknown>;
};

export type NormalizedSource = SourceRecord & {
  title: string;
  summary: string;
  content: string;
  tags: string[];
};

export type ChangeEventType =
  | "release"
  | "breaking_change"
  | "deprecation"
  | "security"
  | "api_change"
  | "documentation"
  | "performance"
  | "ecosystem";
export type ChangeStatus = "new" | "read" | "learning" | "completed" | "disputed" | "failed";

export type ChangeClassification = {
  eventType: ChangeEventType;
  changeStatus: ChangeStatus;
  confidence: "high" | "medium" | "low";
  reasons: string[];
  migrationRequired: boolean | null;
};

export type ChangeEvent = {
  id: string;
  projectId: string;
  eventType: ChangeEventType;
  title: string;
  sourceUrl: string;
  supportingSourceIds: string[];
  publishedAt: string | null;
  detectedAt: string;
  versionFrom: string | null;
  versionTo: string | null;
  importance: number;
  changeStatus: ChangeStatus;
  uncertainty: string | null;
};

export type BeforeAfter = { before: string; after: string; language: string | null; sourceIds: string[] };
export type Evidence = { sourceId: string; kind: "fact" | "explanation" | "inference"; excerpt: string; url: string };

export type ChangeBrief = {
  eventId: string;
  whatChanged: string;
  whyItMatters: string;
  affectedUsers: string[];
  migrationRequired: boolean | null;
  beforeAfter: BeforeAfter[];
  risks: string[];
  relatedConcepts: string[];
  evidence: Evidence[];
  generatedAt: string;
  modelVersion: string | null;
  status: "ready" | "uncertain" | "failed";
  uncertainty: string | null;
};

export type LearningTaskType = "code_reading" | "diff_judgement" | "migration_choice";
export type LearningTask = {
  id: string;
  eventId: string;
  taskType: LearningTaskType;
  question: string;
  starterCode: string | null;
  expectedConcept: string;
  solution: string;
  difficulty: "beginner" | "intermediate" | "advanced";
};

export type MasteryState = "new" | "learning" | "mastered";
export type ReviewCard = {
  id: string;
  eventId: string;
  misconceptionCode: string | null;
  reviewDueAt: string;
  masteryState: MasteryState;
  userNote: string | null;
};
export type PersonalNote = { id: string; eventId: string; body: string; createdAt: string; updatedAt: string };
