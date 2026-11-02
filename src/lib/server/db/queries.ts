import { and, asc, eq, inArray, sql } from "drizzle-orm";

import { db } from "./index";
import { albums, artists, jobs, tracks } from "./schema";

export interface ArtistWithCounts {
  uuid: string;
  title: string;
  image: string | null;
  summary: string | null;
  albumCount: number;
  syncedAlbums: number;
}

export async function getArtistsWithCounts(
  libraryUuid: string,
): Promise<ArtistWithCounts[]> {
  const rows = await db
    .select({
      uuid: artists.uuid,
      title: artists.title,
      image: artists.image,
      summary: artists.summary,
      albumCount: sql<number>`count(${albums.uuid})`,
      syncedAlbums: sql<number>`coalesce(sum(case when ${albums.synced} then 1 else 0 end), 0)`,
    })
    .from(artists)
    .leftJoin(albums, eq(albums.artistUuid, artists.uuid))
    .where(eq(artists.libraryUuid, libraryUuid))
    .groupBy(artists.uuid)
    .orderBy(asc(sql`lower(${artists.title})`));

  return rows.map(row => ({
    ...row,
    albumCount: Number(row.albumCount),
    syncedAlbums: Number(row.syncedAlbums),
  }));
}

export interface AlbumWithCounts {
  uuid: string;
  title: string;
  image: string | null;
  summary: string | null;
  synced: boolean;
  trackCount: number;
  syncedTracks: number;
}

export async function getAlbumsFromArtistWithCounts(
  libraryUuid: string,
  artistUuid: string,
): Promise<AlbumWithCounts[]> {
  const rows = await db
    .select({
      uuid: albums.uuid,
      title: albums.title,
      image: albums.image,
      summary: albums.summary,
      synced: albums.synced,
      trackCount: sql<number>`count(${tracks.uuid})`,
      syncedTracks: sql<number>`coalesce(sum(case when ${tracks.synced} then 1 else 0 end), 0)`,
    })
    .from(albums)
    .leftJoin(
      tracks,
      sql`${tracks.albumUuid} = ${albums.uuid} AND ${tracks.artistUuid} = ${albums.artistUuid}`,
    )
    .where(sql`${albums.libraryUuid} = ${libraryUuid} AND ${albums.artistUuid} = ${artistUuid}`)
    .groupBy(albums.uuid)
    .orderBy(asc(sql`lower(${albums.title})`));

  return rows.map(row => ({
    ...row,
    trackCount: Number(row.trackCount),
    syncedTracks: Number(row.syncedTracks),
  }));
}

export interface TrackRow {
  key: string;
  title: string;
  path: string | null;
  duration: number | null;
  trackNumber: number;
  synced: boolean;
  syncStatus: "pending" | "synced" | "no_lyrics" | "error";
  syncing: boolean;
}

export async function getTracksFromAlbum(
  libraryUuid: string,
  albumUuid: string,
): Promise<TrackRow[]> {
  const rows = await db
    .select({
      key: tracks.key,
      title: tracks.title,
      path: tracks.path,
      duration: tracks.duration,
      trackNumber: tracks.trackNumber,
      synced: tracks.synced,
      syncStatus: tracks.syncStatus,
    })
    .from(tracks)
    .where(sql`${tracks.libraryUuid} = ${libraryUuid} AND ${tracks.albumUuid} = ${albumUuid}`)
    .orderBy(asc(tracks.trackNumber));

  if (rows.length === 0) {
    return [];
  }

  // Track sync_status records the last result; the jobs table holds the
  // current activity. Include queued jobs so an entire "Sync All" batch
  // shows spinners, even before the worker reaches each track.
  const activeJobs = await db
    .select({ trackKey: jobs.targetUuid })
    .from(jobs)
    .where(and(
      eq(jobs.kind, "sync_track"),
      inArray(jobs.status, ["queued", "running"]),
      inArray(jobs.targetUuid, rows.map(row => row.key)),
    ));
  const activeKeys = new Set(activeJobs.map(job => job.trackKey));

  return rows.map(row => ({ ...row, syncing: activeKeys.has(row.key) }));
}
