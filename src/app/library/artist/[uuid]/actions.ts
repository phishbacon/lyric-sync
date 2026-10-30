"use server";

import { enqueueSyncBatch } from "@/lib/server/jobs/worker";

export interface SyncActionResult {
  queued: number;
  message: string;
}

/** "Sync All" on an artist page: one job per unsynced, unresolved track. */
export async function syncArtist(artistUuid: string): Promise<SyncActionResult> {
  const queued = await enqueueSyncBatch({ artistUuid });
  return {
    queued,
    message: queued === 0
      ? "Nothing to sync — every track already has lyrics or was checked."
      : `Queued ${queued} track${queued === 1 ? "" : "s"} for sync.`,
  };
}
