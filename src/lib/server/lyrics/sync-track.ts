import { and, eq } from "drizzle-orm";
import { writeFile } from "node:fs/promises";

import { db } from "@/lib/server/db";
import { albums, artists, tracks } from "@/lib/server/db/schema";
import {
  findExistingLyricFile,
  stripExtension,
} from "@/lib/server/lyrics/disk-check";
import { fetchLyrics } from "@/lib/server/lyrics/lrclib";

export type SyncTrackResult = "synced" | "no_lyrics";

/**
 * Sync one track (identified by its Plex `key`, the jobs.targetUuid of a
 * sync_track job): disk-first check, then lrclib, then write the lyric file
 * next to the audio. User files are never deleted or overwritten — an
 * existing .lrc may carry hand-tuned timestamps and always wins.
 *
 * `force` is a manual per-track sync: it bypasses the "a .txt already counts
 * as synced" short-circuit so a plain-text track can be upgraded to .lrc.
 */
export async function syncTrack(
  trackKey: string,
  force: boolean,
): Promise<SyncTrackResult> {
  const track = await db.query.tracks.findFirst({
    where: eq(tracks.key, trackKey),
  });
  if (!track) {
    throw new Error(`Track not found: ${trackKey}`);
  }
  if (!track.path) {
    throw new Error(`Track has no file path: ${track.title} (${trackKey})`);
  }

  // Disk-first: an .lrc is the best possible outcome, for batch and manual
  // alike. A .txt satisfies batch runs; force falls through to upgrade it.
  const existing = await findExistingLyricFile(track.path);
  if (existing !== null && (existing.endsWith(".lrc") || !force)) {
    await markSynced(trackKey, track.albumUuid);
    return "synced";
  }

  const [artist, album] = await Promise.all([
    db.query.artists.findFirst({
      where: eq(artists.uuid, track.artistUuid),
      columns: { title: true },
    }),
    db.query.albums.findFirst({
      where: eq(albums.uuid, track.albumUuid),
      columns: { title: true },
    }),
  ]);

  let record: Awaited<ReturnType<typeof fetchLyrics>>;
  try {
    record = await fetchLyrics({
      artistName: artist?.title ?? "",
      trackName: track.title,
      albumName: album?.title ?? null,
      durationSec: track.duration === null ? null : Math.round(track.duration / 1000),
    });
  } catch (cause) {
    // Transient lrclib failure — surface it on the track (not just the job)
    // so the badge reads "Error" rather than a misleading "Pending", and the
    // row stays eligible for the next batch retry.
    await db
      .update(tracks)
      .set({ synced: false, syncStatus: "error" })
      .where(eq(tracks.key, trackKey));
    throw cause;
  }

  if (record === null) {
    await markNoLyrics(trackKey);
    return "no_lyrics";
  }

  const stem = stripExtension(track.path);
  if (record.syncedLyrics?.trim()) {
    await writeFile(`${stem}.lrc`, record.syncedLyrics, "utf8");
  } else if (record.plainLyrics?.trim()) {
    // Only reached when no lyric file exists yet (the .lrc case short-
    // circuits above): a plain .txt never replaces synced lyrics.
    await writeFile(`${stem}.txt`, record.plainLyrics, "utf8");
  } else {
    await markNoLyrics(trackKey);
    return "no_lyrics";
  }

  await markSynced(trackKey, track.albumUuid);
  return "synced";
}

async function markSynced(trackKey: string, albumUuid: string): Promise<void> {
  await db
    .update(tracks)
    .set({ synced: true, syncStatus: "synced" })
    .where(eq(tracks.key, trackKey));

  // Flip the album-level flag once its last unsynced track lands, so the
  // library/artist grids stop showing partial counts.
  const remaining = await db
    .select({ n: tracks.key })
    .from(tracks)
    .where(
      and(eq(tracks.albumUuid, albumUuid), eq(tracks.synced, false)),
    );
  if (remaining.length === 0) {
    await db.update(albums).set({ synced: true }).where(eq(albums.uuid, albumUuid));
  }
}

async function markNoLyrics(trackKey: string): Promise<void> {
  await db
    .update(tracks)
    .set({ synced: false, syncStatus: "no_lyrics" })
    .where(eq(tracks.key, trackKey));
}
