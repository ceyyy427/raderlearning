import assert from "node:assert/strict";
import test from "node:test";
import { DocsAdapter } from "../src/sources/docs-adapter.ts";
import { GitHubAdapter } from "../src/sources/github-adapter.ts";
import { canonicalSourceUrl, contentHash, retainSnapshots, type SourceFetcher } from "../src/sources/source-adapter.ts";
import type { Project, SourceRecord } from "../src/types.ts";

const release = { id: 10, html_url: "https://github.com/acme/widget/releases/tag/v2.0.0#notes", tag_name: "v2.0.0", target_commitish: "main", published_at: "2026-01-02T03:04:05Z", name: "Widget 2", body: "A release." };
const issue = { id: 11, html_url: "https://github.com/acme/widget/issues/11?utm_source=test", created_at: "2026-01-03T03:04:05Z", title: "Fix it", body: "Issue body" };
const pull = { id: 12, html_url: "https://github.com/acme/widget/pull/12", created_at: "2026-01-04T03:04:05Z", title: "Ship it", body: "PR body", pull_request: { url: "api" } };

function project(overrides: Partial<Project> = {}): Project {
  return { id: "p1", provider: "github", owner: "acme", repo: "widget", name: "Widget", description: null, defaultBranch: "main", language: "TypeScript", topics: [], watchRules: { releases: true, issues: true, pullRequests: true, documentation: true, changelog: true, keywords: [] }, status: "active", lastSyncedAt: null, ...overrides };
}

class FixtureFetcher implements SourceFetcher {
  calls: string[] = [];
  optionsByUrl: Record<string, { headers?: Record<string, string>; timeoutMs?: number } | undefined> = {};
  private readonly responses: Record<string, { status: number; body: string }>;
  constructor(responses: Record<string, { status: number; body: string }>) { this.responses = responses; }
  async fetch(url: string, options?: { headers?: Record<string, string>; timeoutMs?: number }): Promise<{ status: number; headers: Record<string, string>; body: string }> {
    this.calls.push(url);
    this.optionsByUrl[url] = options;
    const response = this.responses[url];
    if (!response) throw new Error(`fixture missing: ${url}`);
    return { ...response, headers: { "content-type": "application/json" } };
  }
}

test("GitHub adapter emits release, issue and pull request records", async () => {
  const fetcher = new FixtureFetcher({
    "https://api.github.com/repos/acme/widget/releases?per_page=30": { status: 200, body: JSON.stringify([release]) },
    "https://api.github.com/repos/acme/widget/issues?state=all&per_page=30": { status: 200, body: JSON.stringify([issue, pull]) },
  });
  const records = await new GitHubAdapter(fetcher, { token: "secret" }).fetchProject(project());
  assert.deepEqual(records.map((r) => r.sourceType), ["github_release", "github_issue", "github_pull_request"]);
  assert.deepEqual(records.map((r) => r.providerId), ["10", "11", "12"]);
  assert.equal(records[0]!.versionFrom, "main");
  assert.equal(records[0]!.versionTo, "v2.0.0");
  assert.equal(records[0]!.publishedAt, "2026-01-02T03:04:05Z");
  assert.equal(records[1]!.publishedAt, "2026-01-03T03:04:05Z");
  assert.equal(records.every((r) => r.status === "ok" && r.contentHash?.length === 64 && r.rawContent), true);
  assert.equal(records[1]!.canonicalUrl, "https://github.com/acme/widget/issues/11");
  assert.equal(fetcher.optionsByUrl["https://api.github.com/repos/acme/widget/releases?per_page=30"]?.headers?.Authorization, "Bearer secret");
  assert.equal(fetcher.optionsByUrl["https://api.github.com/repos/acme/widget/issues?state=all&per_page=30"]?.headers?.Accept, "application/vnd.github+json");
});

test("GitHub adapters cap over-sized endpoint responses at 30 items", async () => {
  const releases = Array.from({ length: 31 }, (_, index) => ({ ...release, id: index + 1, html_url: `https://github.com/acme/widget/releases/${index + 1}` }));
  const issues = Array.from({ length: 31 }, (_, index) => ({ ...issue, id: index + 100, html_url: `https://github.com/acme/widget/issues/${index + 100}` }));
  const fetcher = new FixtureFetcher({
    "https://api.github.com/repos/acme/widget/releases?per_page=30": { status: 200, body: JSON.stringify(releases) },
    "https://api.github.com/repos/acme/widget/issues?state=all&per_page=30": { status: 200, body: JSON.stringify(issues) },
  });
  const records = await new GitHubAdapter(fetcher).fetchProject(project({ watchRules: { releases: true, issues: true, pullRequests: false, documentation: false, changelog: false, keywords: [] } }));
  assert.equal(records.filter((record) => record.sourceType === "github_release").length, 30);
  assert.equal(records.filter((record) => record.sourceType === "github_issue").length, 30);
});

test("invalid GitHub identity fields become failed records without inventing URLs", async () => {
  const fetcher = new FixtureFetcher({
    "https://api.github.com/repos/acme/widget/releases?per_page=30": { status: 200, body: JSON.stringify([
      release,
      { ...release, id: undefined, html_url: "https://github.com/acme/widget/releases/missing-id" },
      { ...release, id: 13, html_url: "not-a-url" },
      { ...release, id: 14, html_url: "https://github.com/acme/widget/releases/14" },
    ]) },
  });
  const records = await new GitHubAdapter(fetcher).fetchProject(project({ watchRules: { releases: true, issues: false, pullRequests: false, documentation: false, changelog: false, keywords: [] } }));
  assert.deepEqual(records.map((record) => record.status), ["ok", "failed", "failed", "ok"]);
  assert.equal(records[1]!.rawContent, null);
  assert.match(records[1]!.error!, /numeric id/);
  assert.match(records[2]!.error!, /html_url/);
  assert.equal(records[2]!.url, "https://api.github.com/repos/acme/widget/releases?per_page=30");
  assert.equal(records[2]!.url.includes("github.com/acme/widget/releases/missing"), false);
});

test("disabled GitHub rules do not invoke their endpoint", async () => {
  const fetcher = new FixtureFetcher({});
  const records = await new GitHubAdapter(fetcher).fetchProject(project({ watchRules: { releases: false, issues: false, pullRequests: false, documentation: false, changelog: false, keywords: [] } }));
  assert.deepEqual(records, []);
  assert.deepEqual(fetcher.calls, []);
});

test("disabled documentation rules do not invoke configured URLs", async () => {
  const fetcher = new FixtureFetcher({ "https://docs.example.test/widget": { status: 200, body: "# Docs" } });
  const records = await new DocsAdapter(fetcher, { documentationUrl: "https://docs.example.test/widget" }).fetchProject(project({ watchRules: { releases: false, issues: false, pullRequests: false, documentation: false, changelog: false, keywords: [] } }));
  assert.deepEqual(records, []);
  assert.deepEqual(fetcher.calls, []);
});

test("docs and changelog preserve body and omit unproven dates", async () => {
  const docs = "# Docs\n\nNo date here.";
  const fetcher = new FixtureFetcher({ "https://docs.example.test/widget": { status: 200, body: docs }, "https://docs.example.test/changelog": { status: 200, body: "<h1>Changelog</h1>" } });
  const records = await new DocsAdapter(fetcher, { documentationUrl: "https://docs.example.test/widget", changelogUrl: "https://docs.example.test/changelog" }).fetchProject(project());
  assert.equal(records[0]!.rawContent, docs);
  assert.equal(records[0]!.publishedAt, null);
  assert.equal(records[1]!.sourceType, "changelog");
});

test("malformed documentation URLs become failed records and do not block other endpoints", async () => {
  const badUrl = "::::bad";
  const goodUrl = "https://docs.example.test/changelog";
  const fetcher = new FixtureFetcher({ [goodUrl]: { status: 200, body: "# Changelog" } });
  const records = await new DocsAdapter(fetcher, { documentationUrl: badUrl, changelogUrl: goodUrl }).fetchProject(project());
  assert.equal(records.length, 2);
  assert.equal(records[0]!.status, "failed");
  assert.equal(records[0]!.canonicalUrl, badUrl);
  assert.match(records[0]!.error!, /fixture missing|Invalid URL/);
  assert.equal(records[1]!.status, "ok");
});

test("failed source responses remain visible beside successful endpoints", async () => {
  const fetcher = new FixtureFetcher({
    "https://api.github.com/repos/acme/widget/releases?per_page=30": { status: 503, body: "down" },
    "https://api.github.com/repos/acme/widget/issues?state=all&per_page=30": { status: 200, body: JSON.stringify([issue]) },
  });
  const records = await new GitHubAdapter(fetcher).fetchProject(project());
  assert.equal(records[0]!.status, "failed");
  assert.equal(records[0]!.rawContent, null);
  assert.match(records[0]!.error!, /503/);
  assert.equal(records[1]!.status, "ok");
  const docs = await new DocsAdapter(new FixtureFetcher({ "https://docs.example.test/widget": { status: 404, body: "no" }, "https://docs.example.test/changelog": { status: 200, body: "# Changelog" } }), { documentationUrl: "https://docs.example.test/widget", changelogUrl: "https://docs.example.test/changelog" }).fetchProject(project());
  assert.equal(docs[0]!.status, "failed");
  assert.equal(docs[1]!.status, "ok");
});

test("URL canonicalization and content hashes are stable", () => {
  assert.equal(canonicalSourceUrl("https://example.test:443/a?utm_source=x&b=2&b=1#frag"), "https://example.test/a?b=1&b=2");
  assert.equal(canonicalSourceUrl("https://example.test/a?foo=1&ref=x&source=y&from=z&ref_src=q&share_source=s&spm=1&sessionid=2#frag"), "https://example.test/a?foo=1");
  assert.equal(contentHash("abc"), contentHash("abc"));
  assert.equal(contentHash("abc").length, 64);
});

test("normalize is source-grounded and retainSnapshots preserves immutable history", async () => {
  const fetcher = new FixtureFetcher({ "https://api.github.com/repos/acme/widget/releases?per_page=30": { status: 200, body: JSON.stringify([release]) } });
  const adapter = new GitHubAdapter(fetcher);
  const record = (await adapter.fetchProject(project({ watchRules: { releases: true, issues: false, pullRequests: false, documentation: false, changelog: false, keywords: [] } })))[0]!;
  const normalized = adapter.normalize(record);
  assert.equal(normalized.title, "Widget 2");
  assert.equal(normalized.content, "A release.");
  assert.deepEqual(normalized.tags, ["release", "version:v2.0.0"]);
  const changed = { ...record, id: "new", rawContent: JSON.stringify({ ...release, body: "Changed" }), contentHash: contentHash(JSON.stringify({ ...release, body: "Changed" })) };
  const failed: SourceRecord = { ...record, id: "failed", status: "failed", contentHash: null, rawContent: null, error: "timeout" };
  const retained = retainSnapshots([record], [record, changed, failed]);
  assert.equal(retained.length, 3);
  assert.equal(retained[0]!.rawContent, record.rawContent);
  assert.equal(retainSnapshots(retained, [record]).length, 3);
});
