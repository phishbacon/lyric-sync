import { and, eq } from "drizzle-orm";
import { constants } from "node:fs";
import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { db } from "@/lib/server/db";
import { albums, artists, tracks } from "@/lib/server/db/schema";
import { env } from "@/lib/server/env";
import {
  findExistingLyricFile,
  stripExtension,
} from "@/lib/server/lyrics/disk-check";
import { fetchLyrics } from "@/lib/server/lyrics/fetch-lyrics";
import { resolveLyricPath } from "@/lib/server/lyrics/music-path";

export type SyncTrackResult = "synced" | "no_lyrics";

/**
 * Sync one track (identified by its Plex `key`, the jobs.targetUuid of a
 * sync_track job): disk-first check, then lyric providers, then write the file
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
  const lyricPath = resolveLyricPath(track.path);

  // Disk-first: an .lrc is the best possible outcome, for batch and manual
  // alike. A .txt satisfies batch runs; force falls through to upgrade it.
  const existing = await findExistingLyricFile(track.path);
  if (existing !== null && (existing.endsWith(".lrc") || !force)) {
    await markSynced(trackKey, track.albumUuid);
    return "synced";
  }

  // A mirror contains lyric files and album directories, not the audio itself.
  // Create new album directories as Plex discovers them. For ordinary runs,
  // keep requiring the real audio directory to exist and be writable.
  try {
    if (env.LYRIC_SYNC_MUSIC_MIRROR_ROOT) {
      await mkdir(dirname(lyricPath), { recursive: true });
    }
    await access(dirname(lyricPath), constants.W_OK);
  } catch {
    await markError(trackKey);
    throw new Error(`Cannot write lyrics beside ${lyricPath}: check music directory permissions`);
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
    // Transient provider failure — surface it on the track (not just the job)
    // so the badge reads "Error" rather than a misleading "Pending", and the
    // row stays eligible for the next batch retry.
    await markError(trackKey);
    throw cause;
  }

  if (record === null) {
    await markNoLyrics(trackKey);
    return "no_lyrics";
  }

  const stem = stripExtension(lyricPath);
  if (!record.syncedLyrics?.trim() && !record.plainLyrics?.trim()) {
    await markNoLyrics(trackKey);
    return "no_lyrics";
  }

  try {
    if (record.syncedLyrics?.trim()) {
      await writeFile(`${stem}.lrc`, record.syncedLyrics, "utf8");
    } else if (record.plainLyrics?.trim()) {
      // A plain .txt never replaces synced lyrics.
      await writeFile(`${stem}.txt`, record.plainLyrics, "utf8");
    }
  } catch (cause) {
    await markError(trackKey);
    throw cause;
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

async function markError(trackKey: string): Promise<void> {
  await db
    .update(tracks)
    .set({ synced: false, syncStatus: "error" })
    .where(eq(tracks.key, trackKey));
}
