// GitHub read access for sources published from repositories (token raises the rate limit).
import { credential } from "../../config.ts";
import { guardedFetch } from "../../lib/http-fetch.ts";

function headers() {
  const token = credential("collectors", "GITHUB_TOKEN");
  return { accept: "application/vnd.github+json", ...(token ? { authorization: `Bearer ${token}` } : {}) };
}

export async function githubJson<T>(path: string): Promise<T> {
  const res = await guardedFetch(`https://api.github.com/${path.replace(/^\//, "")}`, { headers: headers(), timeoutMs: 30_000, maxBytes: 32 * 1024 * 1024 });
  if (res.status !== 200) throw new Error(`GitHub ${path} HTTP ${res.status}: ${res.text().slice(0, 200)}`);
  return JSON.parse(res.text()) as T;
}

/** The head commit (sha and time) of a repository, optionally for one path. */
export async function headCommit(repo: string, filePath?: string): Promise<{ sha: string; date: string }> {
  const list = await githubJson<Array<{ sha: string; commit: { committer: { date: string } } }>>(`repos/${repo}/commits?per_page=1${filePath ? `&path=${encodeURIComponent(filePath)}` : ""}`);
  if (!list[0]) throw new Error(`no commits for ${repo}${filePath ? `/${filePath}` : ""}`);
  return { sha: list[0].sha, date: list[0].commit.committer.date };
}
