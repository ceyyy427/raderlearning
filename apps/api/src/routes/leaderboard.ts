// First-party leaderboard endpoints (/api/site/leaderboard*). Read-only views of the latest published run.
import type { FastifyInstance } from "fastify";
import { LEADERBOARD_PUBLIC_BOARDS, type LeaderboardBoardKey } from "@aihot/contracts/taxonomy";
import { loadBoard, loadModel, loadRulesData, loadSource, loadSources, NoLeaderboardRun } from "@aihot/backend/leaderboard/read";
import { sendJsonWithEtag, sendProblem } from "../http/respond.ts";
import { siteHandler } from "./site.ts";

const CACHE = "public, max-age=120, s-maxage=300, stale-while-revalidate=600";

export function registerLeaderboard(app: FastifyInstance) {
  const guarded = (fn: Parameters<typeof siteHandler>[0]) =>
    siteHandler(async (req, reply) => {
      try {
        return await fn(req, reply);
      } catch (error) {
        if (error instanceof NoLeaderboardRun) {
          return sendProblem(req, reply, { status: 503, code: "temporarily_unavailable", detail: "leaderboard not computed yet", retryAfter: 300 });
        }
        throw error;
      }
    });

  const notFound = (req: Parameters<typeof sendProblem>[0], reply: Parameters<typeof sendProblem>[1]) =>
    sendProblem(req, reply, { status: 404, code: "not_found", detail: "not found", cacheControl: "public, max-age=60" });

  app.get("/api/site/leaderboard/boards/:key", guarded(async (req, reply) => {
    const key = (req.params as { key: string }).key;
    if (!(LEADERBOARD_PUBLIC_BOARDS as readonly string[]).includes(key)) return notFound(req, reply);
    const body = await loadBoard(key as LeaderboardBoardKey);
    if (!body) return notFound(req, reply);
    return sendJsonWithEtag(req, reply, body, { etagPrefix: `lb-${key}`, cacheControl: CACHE });
  }));

  app.get("/api/site/leaderboard/models/:slug", guarded(async (req, reply) => {
    const body = await loadModel((req.params as { slug: string }).slug);
    if (!body) return notFound(req, reply);
    return sendJsonWithEtag(req, reply, body, { etagPrefix: "lb-model", cacheControl: CACHE });
  }));

  app.get("/api/site/leaderboard/sources", guarded(async (req, reply) => {
    return sendJsonWithEtag(req, reply, await loadSources(), { etagPrefix: "lb-sources", cacheControl: CACHE });
  }));

  app.get("/api/site/leaderboard/sources/:key", guarded(async (req, reply) => {
    const body = await loadSource((req.params as { key: string }).key);
    if (!body) return notFound(req, reply);
    return sendJsonWithEtag(req, reply, body, { etagPrefix: "lb-source", cacheControl: CACHE });
  }));

  app.get("/api/site/leaderboard/rules", guarded(async (req, reply) => {
    return sendJsonWithEtag(req, reply, await loadRulesData(), { etagPrefix: "lb-rules", cacheControl: CACHE });
  }));
}
