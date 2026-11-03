import { and, asc, eq, inArray, ne } from "drizzle-orm";

import { logger } from "@/lib/logger";
import { db } from "@/lib/server/db";
import { eligibleTrackSelection, type ListingFilters, type ListingKind } from "@/lib/server/db/library-listings";
import { albums, artists, jobs, taskBatches, tracks } from "@/lib/server/db/schema";
import { ingestLibrary, PlexAuthExpiredError } from "@/lib/server/ingest/plex-fetch";
import { emitJobEvent } from "@/lib/server/jobs/events";
import { syncTrack } from "@/lib/server/lyrics/sync-track";

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
  if (job.kind === "sync_track") {
    if (job.targetUuid === null) {
      throw new Error("sync_track job missing target track");
    }
    await syncTrack(job.targetUuid, job.force);
    return;
  }

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
  emitJobEvent({ jobId: job.id, kind: job.kind, status: "running", targetUuid: job.targetUuid });

  try {
    await runJob(job);
    await db
      .update(jobs)
      .set({ status: "done", finishedAt: new Date(), error: null })
      .where(eq(jobs.id, job.id));
    emitJobEvent({ jobId: job.id, kind: job.kind, status: "done", targetUuid: job.targetUuid });
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
    emitJobEvent({
      jobId: job.id,
      kind: job.kind,
      status: "failed",
      targetUuid: job.targetUuid,
      error: message,
    });
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
  // A previous process may have died while a job was in progress. Requeue it;
  // syncTrack checks the disk first, so already written files are skipped.
  const recovered = await db.update(jobs).set({
    status: "queued", startedAt: null, finishedAt: null,
  }).where(eq(jobs.status, "running")).returning({ id: jobs.id, kind: jobs.kind, targetUuid: jobs.targetUuid });
  for (const job of recovered) {
    emitJobEvent({ jobId: job.id, kind: job.kind, status: "queued", targetUuid: job.targetUuid });
  }
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
  emitJobEvent({ jobId: row.id, kind: "plex_fetch", status: "queued", targetUuid: libraryUuid });
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

/**
 * Queue a sync for one track. `force` is a manual per-track sync: it always
 * re-asks lyric providers even when a .txt counts as synced for batches.
 * Dedupes against an already-queued job for the same track; a manual sync
 * upgrades a queued batch job to force rather than stacking a second one.
 */
export async function enqueueSyncTrack(
  trackKey: string,
  force = false,
): Promise<number | null> {
  const existing = await db.query.jobs.findFirst({
    where: and(
      eq(jobs.kind, "sync_track"),
      eq(jobs.targetUuid, trackKey),
      inArray(jobs.status, ["queued", "running"]),
    ),
  });
  if (existing) {
    if (force && existing.status === "queued" && !existing.force) {
      await db.update(jobs).set({ force: true }).where(eq(jobs.id, existing.id));
    }
    return existing.id;
  }

  const [row] = await db
    .insert(jobs)
    .values({ kind: "sync_track", targetUuid: trackKey, force })
    .returning({ id: jobs.id });
  emitJobEvent({
    jobId: row.id,
    kind: "sync_track",
    status: "queued",
    targetUuid: trackKey,
  });
  return row.id;
}

/**
 * Queue syncs for every track of an album (or artist) that still needs one:
 * unsynced and not already confirmed `no_lyrics`. Returns the number of
 * jobs queued.
 */
export async function enqueueSyncBatch(
  scope: { albumUuid: string } | { artistUuid: string },
): Promise<number> {
  const scopeCondition = "albumUuid" in scope
    ? eq(tracks.albumUuid, scope.albumUuid)
    : eq(tracks.artistUuid, scope.artistUuid);

  const candidates = await db
    .select({ key: tracks.key })
    .from(tracks)
    .where(
      and(
        scopeCondition,
        eq(tracks.synced, false),
        ne(tracks.syncStatus, "no_lyrics"),
      ),
    );
  if (candidates.length === 0) {
    return 0;
  }

  const keys = candidates.map(row => row.key);
  const alreadyQueued = await db
    .select({ targetUuid: jobs.targetUuid })
    .from(jobs)
    .where(
      and(
        eq(jobs.kind, "sync_track"),
        inArray(jobs.status, ["queued", "running"]),
        inArray(jobs.targetUuid, keys),
      ),
    );
  const queuedKeys = new Set(alreadyQueued.map(row => row.targetUuid));

  const fresh = keys.filter(key => !queuedKeys.has(key));
  if (fresh.length === 0) {
    return 0;
  }

  const isAlbum = "albumUuid" in scope;
  const targetUuid = isAlbum ? scope.albumUuid : scope.artistUuid;
  const target = isAlbum
    ? await db.query.albums.findFirst({ where: eq(albums.uuid, targetUuid), columns: { title: true } })
    : await db.query.artists.findFirst({ where: eq(artists.uuid, targetUuid), columns: { title: true } });
  const [batch] = await db.insert(taskBatches).values({
    scope: isAlbum ? "album" : "artist",
    targetUuid,
    title: target?.title ?? (isAlbum ? "Album" : "Artist"),
  }).returning({ id: taskBatches.id });

  let inserted: Array<{ id: number; targetUuid: string | null }>;
  try {
    inserted = await db.insert(jobs)
      .values(fresh.map(key => ({ kind: "sync_track" as const, targetUuid: key, batchId: batch.id })))
      .returning({ id: jobs.id, targetUuid: jobs.targetUuid });
  } catch (cause) {
    await db.delete(taskBatches).where(eq(taskBatches.id, batch.id));
    throw cause;
  }
  for (const row of inserted) {
    emitJobEvent({
      jobId: row.id,
      kind: "sync_track",
      status: "queued",
      targetUuid: row.targetUuid,
    });
  }
  return inserted.length;
}

/** Capture all eligible tracks for the selected library view at click time. */
export async function enqueueLibrarySelection(
  libraryUuid: string, kind: ListingKind, filters: ListingFilters,
): Promise<number> {
  const candidates = await eligibleTrackSelection(libraryUuid, kind, filters);
  if (candidates.length === 0) return 0;

  const [batch] = await db.insert(taskBatches).values({
    scope: "library",
    targetUuid: libraryUuid,
    title: kind === "artists" ? "All artists" : `${kind === "albums" ? "Albums" : "Tracks"} selection`,
  }).returning({ id: taskBatches.id });

  let insertedCount = 0;
  try {
    // SQLite limits bound parameters; a large selection must be chunked.
    for (let offset = 0; offset < candidates.length; offset += 150) {
      const chunk = candidates.slice(offset, offset + 150);
      const inserted = await db.insert(jobs).values(chunk.map(row => ({
        kind: "sync_track" as const, targetUuid: row.key, batchId: batch.id,
      }))).returning({ id: jobs.id, targetUuid: jobs.targetUuid });
      insertedCount += inserted.length;
      for (const row of inserted) emitJobEvent({
        jobId: row.id, kind: "sync_track", status: "queued", targetUuid: row.targetUuid,
      });
    }
  } catch (cause) {
    // Preserve an already-started batch for the worker and queue UI to finish.
    if (insertedCount === 0) await db.delete(taskBatches).where(eq(taskBatches.id, batch.id));
    throw cause;
  }
  return insertedCount;
}
