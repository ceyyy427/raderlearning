import type { PgBoss } from "pg-boss";
import { syncDeveloperProject } from "../developer/sources.ts";
import { QUEUES, work } from "./queue.ts";

export async function registerDeveloperJobs(boss: PgBoss): Promise<void> {
  await work(boss, QUEUES.developerSync, { localConcurrency: 2, pollingIntervalSeconds: 2 }, ({ projectId }) => syncDeveloperProject(projectId));
}
