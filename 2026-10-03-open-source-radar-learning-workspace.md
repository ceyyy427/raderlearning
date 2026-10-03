# Open Source Radar + Learning Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build V0.1 of a local-first developer application that tracks open-source project changes and presents them as traceable learning tasks.

**Architecture:** Preserve AIHOT's ingestion, queue, PostgreSQL, Docker, API, and MCP foundations. Add a developer-domain model for projects and change events, then expose a Radar Inbox and a source-backed Change Brief. Learning tasks are introduced after the change pipeline is stable.

**Tech Stack:** Existing AIHOT Node.js/TypeScript, React, Fastify, PostgreSQL, pg-boss, Tailwind CSS, Docker Compose; use the repository's existing test runner and validation conventions.

**Spec:** `docs/superpowers/specs/2026-10-03-open-source-radar-learning-workspace-design.md`

## Global Constraints

- First release targets individual developers; no teams, accounts, cloud sync, or social features.
- First sources are GitHub Release, Issue, Pull Request, official documentation, and Changelog.
- Every published fact must retain an original source URL and retrieval metadata.
- Model output may explain or classify a change but may not invent source facts.
- Do not execute arbitrary user code in V0.
- Preserve raw snapshots, content hashes, retrieval time, publication time, and model version.
- Use `disputed` or an equivalent visible state when sources conflict.

## Review Focus

- Duplicate Release/Changelog/PR records must collapse into one Change Event; test this in Task 2.
- A source fetch or model failure must not publish a fabricated brief; test source failure in Task 2 and model failure in Task 5.
- A project with no new changes must produce an empty, valid Radar response; test this in Task 4.
- Source updates after initial retrieval must preserve the prior raw snapshot; test this in Task 2.
- Local learning state must survive a page refresh and remain linked to the original event; test this in Task 5.

### Task 1: Repository baseline and developer-domain boundaries

**Files:**
- Create: `packages/developer-domain/src/types.ts`
- Create: `packages/developer-domain/src/index.ts`
- Create: `packages/developer-domain/tests/types.test.ts`
- Modify: existing AIHOT `industry/` configuration entry points to register the developer domain

**Interfaces:**
- Produces `Project`, `SourceRecord`, `ChangeEvent`, `ChangeBrief`, `LearningTask`, and `ReviewCard` TypeScript types exported from `@aihot/developer-domain` (or the repository's equivalent package alias).

- [ ] **Step 1: Write failing type and serialization tests** for required fields, event type values, and `disputed` status.
- [ ] **Step 2: Run the package test command** and confirm the new exports fail because they do not exist.
- [ ] **Step 3: Implement the domain types** without adding database or UI behavior.
- [ ] **Step 4: Run the focused tests and TypeScript check** and confirm they pass.
- [ ] **Step 5: Commit** with `feat: add developer radar domain model`.

### Task 2: GitHub and documentation source adapters

**Files:**
- Create: `packages/developer-domain/src/sources/source-adapter.ts`
- Create: `packages/developer-domain/src/sources/github-adapter.ts`
- Create: `packages/developer-domain/src/sources/docs-adapter.ts`
- Create: `packages/developer-domain/tests/sources.test.ts`
- Modify: existing ingestion registration and queue worker files

**Interfaces:**
- `SourceAdapter.fetchProject(project: Project): Promise<SourceRecord[]>`
- `SourceAdapter.normalize(record: SourceRecord): NormalizedSource`
- `GitHubAdapter.fetchProject(project: Project): Promise<SourceRecord[]>`
- `DocsAdapter.fetchProject(project: Project): Promise<SourceRecord[]>`

- [ ] **Step 1: Write fixtures and failing tests** for Release, Issue/PR, Changelog, content hash, timestamps, and raw snapshot retention.
- [ ] **Step 2: Run focused source tests** and verify failure.
- [ ] **Step 3: Implement adapters** using the repository's existing HTTP, retry, timeout, and credential conventions.
- [ ] **Step 4: Add ingestion registration** so a project sync writes normalized source records and raw snapshots.
- [ ] **Step 5: Run adapter, integration, and type tests**; verify repeated retrieval does not overwrite the prior raw snapshot.
- [ ] **Step 6: Commit** with `feat: ingest open source project changes`.

### Task 3: Deduplication, classification, clustering, and impact scoring

**Files:**
- Create: `packages/developer-domain/src/changes/deduplicate.ts`
- Create: `packages/developer-domain/src/changes/classify.ts`
- Create: `packages/developer-domain/src/changes/cluster.ts`
- Create: `packages/developer-domain/src/changes/importance.ts`
- Create: `packages/developer-domain/tests/changes.test.ts`
- Modify: existing AIHOT clustering and publication job wiring

**Interfaces:**
- `deduplicateSources(records: NormalizedSource[]): NormalizedSource[]`
- `classifyChange(record: NormalizedSource): ChangeClassification`
- `clusterChanges(records: NormalizedSource[]): ChangeEvent[]`
- `scoreImportance(event: ChangeEvent, project: Project): number`

- [ ] **Step 1: Write failing tests** for duplicate sources, one Release plus related Changelog/PR, breaking-change keywords, security changes, and empty input.
- [ ] **Step 2: Run focused tests** and verify failure.
- [ ] **Step 3: Implement deterministic normalization and deduplication** using content hash, canonical URL, provider identifiers, and version metadata.
- [ ] **Step 4: Implement rule-based classification** before any model enrichment.
- [ ] **Step 5: Implement event clustering and personalized importance scoring** with explicit project watch rules.
- [ ] **Step 6: Test conflict handling** and ensure conflicting sources yield `disputed` rather than a merged assertion.
- [ ] **Step 7: Commit** with `feat: build developer change events`.

### Task 4: Radar API and Inbox UI

**Files:**
- Create: `apps/api/src/routes/projects.ts`
- Create: `apps/api/src/routes/radar.ts`
- Create: `apps/web/src/features/projects/ProjectList.tsx`
- Create: `apps/web/src/features/radar/RadarInbox.tsx`
- Create: `apps/web/src/features/radar/ChangeEventCard.tsx`
- Create: `apps/web/src/features/radar/radar.css` or the repository's existing style module
- Create: `apps/web/tests/radar.test.ts`
- Modify: navigation and API route registration

**Interfaces:**
- `GET /api/projects`
- `POST /api/projects`
- `POST /api/projects/:id/sync`
- `GET /api/radar?status=&projectId=&importance=`
- `GET /api/changes/:id`

- [ ] **Step 1: Write failing API tests** for adding a project, empty radar, filtering, and source links.
- [ ] **Step 2: Implement API handlers** using the domain services from Tasks 1–3.
- [ ] **Step 3: Add failing component tests** for loading, empty, error, unread, and high-importance states.
- [ ] **Step 4: Implement the Inbox and project list** with concise cards and explicit source/status labels.
- [ ] **Step 5: Run API, UI, lint, and type checks**.
- [ ] **Step 6: Commit** with `feat: add radar inbox and project management`.

### Task 5: Change Brief and first learning task

**Files:**
- Create: `packages/developer-domain/src/briefs/change-brief.ts`
- Create: `packages/developer-domain/src/learning/tasks.ts`
- Create: `apps/api/src/routes/briefs.ts`
- Create: `apps/web/src/features/briefs/ChangeBrief.tsx`
- Create: `apps/web/src/features/learning/LearningTask.tsx`
- Create: `apps/web/tests/briefs.test.ts`

**Interfaces:**
- `generateChangeBrief(event: ChangeEvent, evidence: SourceRecord[]): Promise<ChangeBrief>`
- `createLearningTask(brief: ChangeBrief): LearningTask`
- `GET /api/changes/:id/brief`
- `GET /api/changes/:id/task`

- [ ] **Step 1: Write failing tests** for source-backed fields, model failure, disputed evidence, Before/After content, and a migration-choice task.
- [ ] **Step 2: Implement brief generation** with model version, evidence IDs, generated timestamp, and explicit uncertainty.
- [ ] **Step 3: Implement a deterministic first task template** so the product remains useful when model generation is unavailable.
- [ ] **Step 4: Implement the Change Brief page** in the fixed order from the spec.
- [ ] **Step 5: Implement the first learning task UI** without executing arbitrary code.
- [ ] **Step 6: Run focused tests and the full project verification commands**.
- [ ] **Step 7: Commit** with `feat: add source-backed change briefs and learning tasks`.

### Task 6: Local Workspace and Review cards

**Files:**
- Create: `apps/web/src/features/workspace/workspace-store.ts`
- Create: `apps/web/src/features/workspace/LearningWorkspace.tsx`
- Create: `apps/web/src/features/review/ReviewPage.tsx`
- Create: `apps/web/tests/workspace.test.ts`
- Modify: client routing and the Change Brief save action

**Interfaces:**
- `saveWorkspaceItem(eventId: string): void`
- `recordTaskResult(eventId: string, result: TaskResult): void`
- `getDueReviewCards(now: Date): ReviewCard[]`

- [ ] **Step 1: Write failing browser/storage tests** for save, reload persistence, task result, review due date, and link back to the source event.
- [ ] **Step 2: Implement a versioned local storage schema** with a migration guard for future changes.
- [ ] **Step 3: Implement Workspace and Review pages** with explicit learning states.
- [ ] **Step 4: Connect Change Brief save and task completion actions.**
- [ ] **Step 5: Run focused tests, build, and a manual Docker smoke test** using one sample project.
- [ ] **Step 6: Commit** with `feat: add local learning workspace and review loop`.

### Task 7: End-to-end acceptance and release gate

**Files:**
- Create: `tests/e2e/open-source-radar.spec.ts`
- Create: `docs/open-source-radar-v0-runbook.md`
- Modify: CI workflow and sample environment configuration

- [ ] **Step 1: Add an end-to-end fixture** representing one project Release, related Changelog, and PR.
- [ ] **Step 2: Test the complete flow** from project creation through Radar, Change Brief, learning task, and Review Card.
- [ ] **Step 3: Test source failure, model failure, duplicate input, and disputed sources.**
- [ ] **Step 4: Run the repository build, lint, typecheck, unit tests, integration tests, and end-to-end test.**
- [ ] **Step 5: Document local Docker startup, sample data reset, and known limitations.**
- [ ] **Step 6: Commit** with `test: add open source radar v0 acceptance gate`.
