import type { FastifyInstance } from "fastify";
import { getDeveloperBrief } from "@aihot/backend/publication/developer";
import { sendJsonWithEtag, sendProblem } from "../http/respond.ts";

export function registerBriefs(app: FastifyInstance) {
  for (const suffix of ["brief", "task"] as const) {
    app.get(`/api/changes/:id/${suffix}`, async (req, reply) => {
      try {
        const result = await getDeveloperBrief((req.params as { id: string }).id);
        if (!result) return sendProblem(req, reply, { status: 404, code: "not_found", detail: "Change not found." });
        return sendJsonWithEtag(req, reply, suffix === "brief" ? result.brief : result.task, { etagPrefix: `developer-${suffix}` , cacheControl: "no-store" });
      } catch (error) {
        req.log.error({ err: error }, `developer ${suffix} failed`);
        return sendProblem(req, reply, { status: 503, code: "temporarily_unavailable", detail: `Change ${suffix} is temporarily unavailable.`, retryAfter: 30 });
      }
    });
  }
}

