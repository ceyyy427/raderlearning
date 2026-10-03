// Terminal-Bench 4 (Harbor, Apache 2.0): each merged submission in harbor-framework/terminal-bench is
// one model + agent system. Every system is kept for reference and none stands for a model, so rows
// are identified by their submission file. Accuracy is converted from percent to a fraction.
import { guardedFetch } from "../../../lib/http-fetch.ts";
import { githubJson, headCommit } from "../github.ts";
import type { Fetcher, ParsedRow } from "../types.ts";

const REPO = "harbor-framework/terminal-bench";
const DIR = "leaderboard/submissions";
const REFERENCE_ONLY = "保留模型与 Agent 的完整系统成绩供参考，不参与综合或编程排名。";

interface Display { url: string; label: string }
interface Submission {
  source_filter: { agent: string; agent_version: string | null; model_name: string; reasoning_effort: string | null };
  metadata: { agent_display: Display; model_display: Display; model_org: Display; date: string | null; reasoning_effort: string | null };
  metrics: { accuracy: number; accuracy_ci95_half_width: number | null; n_trials: number | null };
}

async function raw(sha: string, path: string): Promise<string> {
  const res = await guardedFetch(`https://raw.githubusercontent.com/${REPO}/${sha}/${path}`, { timeoutMs: 30_000, maxBytes: 16 * 1024 * 1024 });
  if (res.status !== 200) throw new Error(`terminal-bench ${path} HTTP ${res.status}`);
  return res.text();
}

export const terminalBench: Fetcher = {
  sourceKeys: ["terminal-bench-4"],
  async fetch() {
    const head = await headCommit(REPO);
    const data = await headCommit(REPO, DIR);
    const files = (await githubJson<Array<{ name: string; type: string }>>(`repos/${REPO}/contents/${DIR}?ref=${head.sha}`))
      .filter((f) => f.type === "file" && f.name.endsWith(".json"));
    // The dataset version and its task count are pinned in the leaderboard's own code.
    const [board, hub, checks] = await Promise.all([raw(head.sha, "leaderboard/leaderboard.yaml"), raw(head.sha, "leaderboard/src/leaderboard/core/hub.py"), raw(head.sha, "leaderboard/src/leaderboard/ci/static_analysis.py")]);
    const version = /^name:\s*(\d+)-(\d+)-(\d+)\s*$/m.exec(board)?.slice(1, 4).join(".") ?? null;
    const datasetRef = /^DATASET_REF\s*=\s*"([^"]+)"/m.exec(hub)?.[1] ?? null;
    const taskCount = Number(/^EXPECTED_TASK_COUNT\s*=\s*(\d+)/m.exec(checks)?.[1]) || null;

    const rows: ParsedRow[] = [];
    for (const f of files) {
      const s = JSON.parse(await raw(head.sha, `${DIR}/${f.name}`)) as Submission;
      const m = s.metrics;
      if (!Number.isFinite(m?.accuracy)) continue;
      const effort = s.metadata.reasoning_effort && s.metadata.reasoning_effort !== "none" ? s.metadata.reasoning_effort : null;
      const label = `${s.metadata.agent_display.label}${s.source_filter.agent_version ? ` ${s.source_filter.agent_version}` : ""} · ${effort ? `${effort} 推理` : "来源未报告推理档位"}`;
      const hw = m.accuracy_ci95_half_width;
      const name = s.source_filter.model_name.split("/").pop()!;
      rows.push({
        sourceModelName: name,
        configurationKey: `tb4:${f.name}`,
        baseName: name,
        organization: s.metadata.model_org?.label ?? null,
        releasedAt: s.metadata.date,
        configuration: { key: `tb4:${f.name}`, label, kind: "SCAFFOLDED", priority: 0, rank: 0, ineligible: REFERENCE_ONLY },
        metricKey: "terminal-bench-4",
        metricName: "Terminal-Bench 4 · 系统参考",
        rawScore: m.accuracy / 100,
        lowerBound: hw == null ? null : (m.accuracy - hw) / 100,
        upperBound: hw == null ? null : (m.accuracy + hw) / 100,
        sampleSize: taskCount,
        metadata: {
          nTrials: m.n_trials,
          taskCount,
          datasetRef,
          scoreField: "accuracy",
          agentDisplay: s.metadata.agent_display.label,
          agentVersion: s.source_filter.agent_version,
          agentFramework: s.source_filter.agent,
          reasoningEffort: s.metadata.reasoning_effort,
          uncertaintyKind: "reported-ci95-half-width",
          uncertaintyUnit: "percentage-points",
          uncertaintyMethod: "1.96 × per-task repeated-trial standard error; trial count is not independent task count",
          benchmarkVersion: version,
          sourceApiModelId: s.source_filter.model_name,
          sourceSubmissionId: f.name,
          sourceSubmissionUrl: `https://raw.githubusercontent.com/${REPO}/${head.sha}/${DIR}/${f.name}`,
          sourceAccuracyPercent: m.accuracy,
          sourceReasoningEffort: effort,
          sourceModelDisplayName: s.metadata.model_display.label,
          sourceCi95HalfWidthPercentagePoints: hw,
          sourceDateMeaning: "model-release-date",
          representativeMode: "CONFIGURATION_ONLY",
          metricDirection: "HIGHER",
        },
      });
    }
    return [{
      sourceKey: "terminal-bench-4",
      sourceName: "Terminal-Bench 4 · 系统参考",
      sourceUrl: `https://api.github.com/repos/${REPO}/contents/${DIR}`,
      license: "Apache 2.0 · 官方 harbor-framework/terminal-bench 仓库内的成绩提交；保留署名、协议与修改说明。",
      attributionUrl: "https://www.tbench.ai/",
      // Scores change only through merged submissions, so the data date is the last commit touching them.
      publishedAt: data.date,
      rows,
      metadata: {
        dataAtKind: "score-data-commit",
        dataCommit: data.sha,
        dataRevision: head.sha,
        datasetRef,
        benchmarkVersion: version,
        evaluatedAt: null,
        attribution: "Harbor / Terminal-Bench · Apache 2.0; accuracy converted from percent to fraction; all submitted systems retained",
        representativeMode: "CONFIGURATION_ONLY",
        sourceDateMeaning: "metadata.date is model release date; score publication comes from changed score content",
        upstreamPublishedAt: data.date,
        sourceOperator: "Harbor / Terminal-Bench",
        sourceFamily: "terminal-agent",
        metricCount: 0,
      },
    }];
  },
};
