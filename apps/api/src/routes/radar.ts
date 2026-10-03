import type { FastifyInstance, FastifyRequest } from "fastify";
import { getDeveloperChange, listRadar } from "@aihot/backend/publication/developer";
import type { ChangeStatus } from "@aihot/developer-domain";
import { QueryError, sendJsonWithEtag, sendProblem, strictQuery } from "../http/respond.ts";

const STATUSES = new Set<ChangeStatus>(["new", "read", "learning", "completed", "disputed", "failed"]);

function params(req: FastifyRequest) {
  const q = strictQuery(req, ["status", "projectId", "importance"]);
  let status: ChangeStatus | undefined;
  if (q.status !== undefined) {
    if (!STATUSES.has(q.status as ChangeStatus)) throw new QueryError("status must be a known change status.");
    status = q.status as ChangeStatus;
  }
  let importance: number | undefined;
  if (q.importance !== undefined) {
    if (!/^\d+$/.test(q.importance)) throw new QueryError("importance must be a non-negative integer.");
    importance = Number(q.importance);
    if (!Number.isSafeInteger(importance)) throw new QueryError("importance must be a non-negative integer.");
  }
  return { status, projectId: q.projectId, importance };
}

export function registerRadar(app: FastifyInstance) {
  app.get("/api/radar", async (req, reply) => {
    try {
      const result = await listRadar(params(req));
      return sendJsonWithEtag(req, reply, result, { etagPrefix: "developer-radar", cacheControl: "no-store", etagOf: { events: result.events, projects: result.projects } });
    } catch (error) {
      if (error instanceof QueryError) return sendProblem(req, reply, { status: 400, code: "invalid_query", detail: error.message });
      req.log.error({ err: error }, "developer radar failed");
      return sendProblem(req, reply, { status: 503, code: "temporarily_unavailable", detail: "Radar is temporarily unavailable.", retryAfter: 30 });
    }
  });

  app.get("/api/changes/:id", async (req, reply) => {
    try {
      const result = await getDeveloperChange((req.params as { id: string }).id);
      if (!result) return sendProblem(req, reply, { status: 404, code: "not_found", detail: "Change not found." });
      return sendJsonWithEtag(req, reply, result, { etagPrefix: "developer-change", cacheControl: "no-store" });
    } catch (error) {
      req.log.error({ err: error }, "developer change detail failed");
      return sendProblem(req, reply, { status: 503, code: "temporarily_unavailable", detail: "Change is temporarily unavailable.", retryAfter: 30 });
    }
  });
}
