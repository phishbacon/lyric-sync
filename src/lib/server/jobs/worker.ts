import { and, asc, eq, inArray } from "drizzle-orm";

import { logger } from "@/lib/logger";
import { db } from "@/lib/server/db";
import { jobs } from "@/lib/server/db/schema";
import { ingestLibrary, PlexAuthExpiredError } from "@/lib/server/ingest/plex-fetch";

const POLL_INTERVAL_MS = 2000;

let running = false;

/**
 * Claim the oldest queued job by flipping it to running. The guarded UPDATE
 * ... RETURNING makes claiming atomic — two workers can never take the same
 * job even if a second process sneaks in.
 */
async function claimNextJob(): Promise<typeof jobs.$inferSelect | null> {
  // The oldest queued id, then flip exactly that row. Filtering the subquery
  // to queued keeps it from naming a running job, and inArray() binds the
  // subquery as SQL — eq() would bind the builder object itself as a param.
  const claimed = await db
    .update(jobs)
    .set({ status: "running", startedAt: new Date() })
    .where(
      and(
        eq(jobs.status, "queued"),
        inArray(
          jobs.id,
          db
            .select({ id: jobs.id })
            .from(jobs)
            .where(eq(jobs.status, "queued"))
            .orderBy(asc(jobs.id))
            .limit(1),
        ),
      ),
    )
    .returning();

  return claimed[0] ?? null;
}

async function runJob(job: typeof jobs.$inferSelect): Promise<void> {
  if (job.kind !== "plex_fetch") {
    throw new Error(`Unknown job kind: ${job.kind}`);
  }

  const server = await db.query.servers.findFirst();
  if (!server) {
    throw new Error("No server configured");
  }
  if (job.targetUuid === null) {
    throw new Error("plex_fetch job missing target library");
  }

  await ingestLibrary(
    {
      baseUrl: server.baseUrl,
      token: server.xPlexToken,
      clientIdentifier: server.clientIdentifier,
    },
    job.targetUuid,
  );
}

async function processOnce(): Promise<boolean> {
  const job = await claimNextJob();
  if (job === null) {
    return false;
  }

  try {
    await runJob(job);
    await db
      .update(jobs)
      .set({ status: "done", finishedAt: new Date(), error: null })
      .where(eq(jobs.id, job.id));
    logger.info({ jobId: job.id, kind: job.kind }, "Job finished");
  } catch (cause) {
    const message = cause instanceof PlexAuthExpiredError
      ? "Plex authentication expired — re-authenticate in settings, then re-fetch"
      : String(cause instanceof Error ? cause.message : cause);

    await db
      .update(jobs)
      .set({
        status: "failed",
        finishedAt: new Date(),
        attempts: job.attempts + 1,
        error: message,
      })
      .where(eq(jobs.id, job.id));
    logger.error({ jobId: job.id, kind: job.kind, err: message }, "Job failed");
  }

  return true;
}

/** Long-running poll loop; started once from instrumentation.ts. */
export async function startJobWorker(): Promise<void> {
  if (running) {
    return;
  }
  running = true;
  logger.info("Job worker started");

  for (;;) {
    try {
      const worked = await processOnce();
      if (!worked) {
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
      }
    } catch (cause) {
      logger.error({ err: String(cause) }, "Job worker iteration failed");
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }
}

export async function enqueuePlexFetch(libraryUuid: string): Promise<number> {
  // Dedupe: one queued-or-running fetch per library is enough.
  const existing = await db.query.jobs.findFirst({
    where: and(eq(jobs.kind, "plex_fetch"), eq(jobs.targetUuid, libraryUuid)),
  });
  if (existing && (existing.status === "queued" || existing.status === "running")) {
    return existing.id;
  }

  const [row] = await db
    .insert(jobs)
    .values({ kind: "plex_fetch", targetUuid: libraryUuid })
    .returning({ id: jobs.id });
  return row.id;
}

export async function getActiveJobCount(): Promise<number> {
  const active = await db.query.jobs.findMany({
    where: and(eq(jobs.status, "queued"), eq(jobs.kind, "plex_fetch")),
  });
  const runningJobs = await db.query.jobs.findMany({
    where: and(eq(jobs.status, "running"), eq(jobs.kind, "plex_fetch")),
  });
  return active.length + runningJobs.length;
}
