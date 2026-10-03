import type { FastifyInstance, FastifyRequest } from "fastify";
import { createDeveloperProject, enqueueDeveloperProjectSync, listDeveloperProjects, type CreateProjectInput } from "@aihot/backend/publication/developer";
import { sendJsonWithEtag, sendProblem } from "../http/respond.ts";

function bodyOf(req: FastifyRequest): Record<string, unknown> {
  return req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body as Record<string, unknown> : {};
}
function inputOf(req: FastifyRequest): CreateProjectInput {
  const body = bodyOf(req);
  if (typeof body.owner !== "string" || typeof body.repo !== "string") throw new Error("owner and repo are required");
  const watchRules = body.watchRules;
  if (watchRules !== undefined && (!watchRules || typeof watchRules !== "object" || Array.isArray(watchRules))) throw new Error("watchRules must be an object");
  return {
    owner: body.owner, repo: body.repo,
    name: body.name === undefined ? undefined : typeof body.name === "string" ? body.name : (() => { throw new Error("name must be a string"); })(),
    description: body.description === undefined ? undefined : body.description === null || typeof body.description === "string" ? body.description : (() => { throw new Error("description must be a string"); })(),
    watchRules: watchRules as CreateProjectInput["watchRules"],
  };
}

export function registerProjects(app: FastifyInstance) {
  app.get("/api/projects", async (req, reply) => {
    try {
      const body = { projects: await listDeveloperProjects() };
      return sendJsonWithEtag(req, reply, body, { etagPrefix: "developer-projects", cacheControl: "no-store", etagOf: body.projects });
    } catch (error) {
      req.log.error({ err: error }, "developer project list failed");
      return sendProblem(req, reply, { status: 503, code: "temporarily_unavailable", detail: "Projects are temporarily unavailable.", retryAfter: 30 });
    }
  });

  app.post("/api/projects", async (req, reply) => {
    try {
      const project = await createDeveloperProject(inputOf(req));
      return reply.code(201).header("Cache-Control", "no-store").header("Location", `/api/projects/${encodeURIComponent(project.id)}`).send(project);
    } catch (error) {
      if (error instanceof Error && /required|must be|safe GitHub|too long/.test(error.message)) return sendProblem(req, reply, { status: 400, code: "invalid_project", detail: error.message });
      req.log.error({ err: error }, "developer project create failed");
      return sendProblem(req, reply, { status: 503, code: "temporarily_unavailable", detail: "Project could not be saved.", retryAfter: 30 });
    }
  });

  app.post("/api/projects/:id/sync", async (req, reply) => {
    const id = (req.params as { id: string }).id;
    try {
      const result = await enqueueDeveloperProjectSync(id);
      return reply.code(202).header("Cache-Control", "no-store").send(result);
    } catch (error) {
      if (error instanceof Error && error.message === "project_not_found") return sendProblem(req, reply, { status: 404, code: "not_found", detail: "Project not found." });
      req.log.error({ err: error }, "developer project sync enqueue failed");
      return sendProblem(req, reply, { status: 503, code: "temporarily_unavailable", detail: "Project sync could not be queued.", retryAfter: 30 });
    }
  });
}
