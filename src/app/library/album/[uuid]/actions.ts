"use server";

import { enqueueSyncBatch, enqueueSyncTrack } from "@/lib/server/jobs/worker";

export interface SyncActionResult {
  queued: number;
  message: string;
}

/** "Sync All" on an album page: one job per unsynced, unresolved track. */
export async function syncAlbum(albumUuid: string): Promise<SyncActionResult> {
  const queued = await enqueueSyncBatch({ albumUuid });
  return {
    queued,
    message: queued === 0
      ? "Nothing to sync — every track already has lyrics or was checked."
      : `Queued ${queued} track${queued === 1 ? "" : "s"} for sync.`,
  };
}

/** Per-track sync: always forces a fresh lrclib attempt (txt → lrc upgrade). */
export async function syncSingleTrack(trackKey: string): Promise<SyncActionResult> {
  const jobId = await enqueueSyncTrack(trackKey, true);
  return {
    queued: jobId === null ? 0 : 1,
    message: jobId === null ? "Already queued." : "Queued for sync.",
  };
}
