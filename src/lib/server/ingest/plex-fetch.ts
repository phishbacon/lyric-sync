import { eq, inArray, sql } from "drizzle-orm";

import { db } from "@/lib/server/db";
import { albums, artists, libraries, tracks } from "@/lib/server/db/schema";
import { findExistingLyricFile } from "@/lib/server/lyrics/disk-check";
import {
  fetchSectionPage,
  type PlexAlbum,
  type PlexArtist,
  plexAlbumSchema,
  plexArtistSchema,
  plexSectionTypes,
  type PlexServerConfig,
  PlexApiError,
  type PlexTrack,
  plexTrackSchema,
} from "@/lib/server/plex/client";

const BATCH_SIZE = 500;

export interface IngestProgress {
  phase: "artists" | "albums" | "tracks" | "done";
  done: number;
  total: number | null;
}

export type ProgressCallback = (progress: IngestProgress) => void;

export class PlexAuthExpiredError extends Error {
  constructor() {
    super("Plex authentication expired");
    this.name = "PlexAuthExpiredError";
  }
}

/**
 * Fetch every artist/album/track of one library from Plex and reconcile the
 * DB: incremental batch upserts, then set-based orphan deletion per level.
 * Upserts never touch `synced`/`sync_status` for existing rows, so sync
 * state survives a refetch. New tracks get an immediate disk-first check so
 * hand-placed lyric files count as synced from the moment of ingestion.
 */
export async function ingestLibrary(
  config: PlexServerConfig,
  libraryUuid: string,
  onProgress: ProgressCallback = () => {},
): Promise<void> {
  const library = await db.query.libraries.findFirst({
    where: eq(libraries.uuid, libraryUuid),
  });
  if (!library) {
    throw new Error(`Library ${libraryUuid} not found`);
  }

  try {
    await ingestLevel(config, library.key, libraryUuid, plexSectionTypes.artists, "artists", onProgress);
    await ingestLevel(config, library.key, libraryUuid, plexSectionTypes.albums, "albums", onProgress);
    await ingestLevel(config, library.key, libraryUuid, plexSectionTypes.tracks, "tracks", onProgress);
  } catch (cause) {
    if (cause instanceof PlexApiError && cause.status === 401) {
      throw new PlexAuthExpiredError();
    }
    throw cause;
  }

  onProgress({ phase: "done", done: 0, total: 0 });
}

async function ingestLevel(
  config: PlexServerConfig,
  libraryKey: string,
  libraryUuid: string,
  type: number,
  level: "artists" | "albums" | "tracks",
  onProgress: ProgressCallback,
): Promise<void> {
  const seenIds: string[] = [];
  let start = 0;
  // Assigned at the top of every loop iteration before any read; the null
  // initializer exists only to satisfy definite-assignment analysis.
  // eslint-disable-next-line no-useless-assignment
  let total: number | null = null;

  for (;;) {
    const page = await fetchSectionPage(config, libraryKey, type, start, BATCH_SIZE, entrySchemaFor(level));

    total = page.totalSize;
    onProgress({ phase: level, done: start, total });

    if (page.items.length === 0) {
      break;
    }

    if (level === "artists") {
      await upsertArtists(libraryUuid, page.items as PlexArtist[]);
    } else if (level === "albums") {
      await upsertAlbums(libraryUuid, page.items as PlexAlbum[]);
    } else {
      await upsertTracks(libraryUuid, page.items as PlexTrack[]);
    }

    for (const item of page.items) {
      // Per-level identity: guids are unique for artists/albums, but shared
      // across album copies for tracks — orphan cleanup diffs against the
      // same identity the table is keyed by.
      seenIds.push(level === "tracks" ? item.key : item.guid);
    }

    start += page.items.length;
    if (total !== null && start >= total) {
      break;
    }
    if (page.items.length < BATCH_SIZE && total === null) {
      break;
    }
  }

  onProgress({ phase: level, done: start, total: total ?? start });

  await deleteOrphans(level, libraryUuid, seenIds);
}

function entrySchemaFor(level: "artists" | "albums" | "tracks") {
  if (level === "artists") {
    return plexArtistSchema;
  }
  return level === "albums" ? plexAlbumSchema : plexTrackSchema;
}

/**
 * Remove rows of this level in this library that Plex no longer reports.
 * Existing identities are read in one query and diffed against the seen set
 * in memory, then deleted in bounded chunks — no oversized NOT IN parameter
 * lists. Identity is the table's own key: guid for artists/albums, ratingKey
 * for tracks (their guids are shared across album copies). Empty seen set is
 * treated as a possibly-flaky listing and skips deletion rather than nuking
 * a whole library.
 */
async function deleteOrphans(
  level: "artists" | "albums" | "tracks",
  libraryUuid: string,
  seenIds: string[],
): Promise<void> {
  if (seenIds.length === 0) {
    return;
  }

  const table = level === "artists" ? artists : level === "albums" ? albums : tracks;
  const libraryColumn = level === "artists"
    ? artists.libraryUuid
    : level === "albums"
      ? albums.libraryUuid
      : tracks.libraryUuid;
  const idColumn = level === "tracks" ? tracks.key : table.uuid;

  const existing = await db
    .select({ id: idColumn })
    .from(table)
    .where(eq(libraryColumn, libraryUuid));

  const seen = new Set(seenIds);
  const removed = existing.map(row => row.id).filter(id => !seen.has(id));

  for (let i = 0; i < removed.length; i += BATCH_SIZE) {
    const chunk = removed.slice(i, i + BATCH_SIZE);
    await db.delete(table).where(inArray(idColumn, chunk));
  }
}

async function upsertArtists(libraryUuid: string, items: PlexArtist[]): Promise<void> {
  if (items.length === 0) {
    return;
  }
  await db
    .insert(artists)
    .values(items.map(item => ({
      uuid: item.guid,
      title: item.title,
      key: item.key,
      summary: item.summary ?? null,
      image: item.thumb ?? item.art ?? null,
      libraryUuid,
    })))
    .onConflictDoUpdate({
      target: artists.uuid,
      set: {
        title: sql`excluded.title`,
        key: sql`excluded.key`,
        summary: sql`excluded.summary`,
        image: sql`excluded.image`,
      },
    });
}

async function upsertAlbums(libraryUuid: string, items: PlexAlbum[]): Promise<void> {
  if (items.length === 0) {
    return;
  }
  await db
    .insert(albums)
    .values(items.map(item => ({
      uuid: item.guid,
      title: item.title,
      key: item.key,
      summary: item.summary ?? null,
      image: item.thumb ?? item.art ?? null,
      libraryUuid,
      artistUuid: item.parentGuid,
    })))
    .onConflictDoUpdate({
      target: albums.uuid,
      set: {
        title: sql`excluded.title`,
        key: sql`excluded.key`,
        summary: sql`excluded.summary`,
        image: sql`excluded.image`,
        // `synced` deliberately untouched — survives refetch.
      },
    });
}

async function upsertTracks(libraryUuid: string, items: PlexTrack[]): Promise<void> {
  if (items.length === 0) {
    return;
  }

  // Disk-first reconciliation for tracks not yet in the DB: existing
  // .lrc/.txt files count as synced with zero network requests.
  const known = await db.query.tracks.findMany({
    columns: { key: true },
    where: inArray(tracks.key, items.map(item => item.key)),
  });
  const knownKeys = new Set(known.map(row => row.key));

  const values = await Promise.all(items.map(async (item) => {
    const path = item.Media?.[0]?.Part?.[0]?.file ?? null;
    const isNew = !knownKeys.has(item.key);
    const onDisk = isNew && await findExistingLyricFile(path) !== null;

    return {
      uuid: item.guid,
      title: item.title,
      key: item.key,
      path,
      duration: item.duration ?? item.Media?.[0]?.Part?.[0]?.duration ?? null,
      trackNumber: item.index ?? 0,
      libraryUuid,
      artistUuid: item.grandparentGuid,
      albumUuid: item.parentGuid,
      ...(onDisk ? { synced: true, syncStatus: "synced" as const } : {}),
    };
  }));

  await db
    .insert(tracks)
    .values(values)
    .onConflictDoUpdate({
      target: tracks.key,
      set: {
        title: sql`excluded.title`,
        uuid: sql`excluded.uuid`,
        path: sql`excluded.path`,
        duration: sql`excluded.duration`,
        trackNumber: sql`excluded.track_number`,
        // Album/artist must follow the entry: rows that predate the re-key
        // (or a moved file) can carry a stale album from another copy of the
        // same recording.
        libraryUuid: sql`excluded.library_uuid`,
        artistUuid: sql`excluded.artist_uuid`,
        albumUuid: sql`excluded.album_uuid`,
        // `synced`/`sync_status` deliberately untouched — survives refetch.
      },
    });
}
