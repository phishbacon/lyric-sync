import { and, asc, desc, eq, inArray, ne, notExists, or, sql, type AnyColumn, type SQL } from "drizzle-orm";

import { db } from "./index";
import { albums, artists, jobs, tracks } from "./schema";

export type ListingKind = "artists" | "albums" | "tracks";
export type AlbumStatus = "all" | "complete" | "partial" | "none";
export type TrackStatus = "all" | "synced" | "unsynced" | "failed";
export type AlbumSort = "title" | "artist" | "year";
export type TrackSort = "title" | "artist" | "album";

export interface ListingFilters {
  q: string;
  status: string;
  sort: string;
  page: number;
}

export const ALBUM_PAGE_SIZE = 60;
export const TRACK_PAGE_SIZE = 100;

const first = (value: string | string[] | undefined) => typeof value === "string" ? value : "";
const choice = <T extends string>(value: string, allowed: readonly T[], fallback: T): T =>
  allowed.find(item => item === value) ?? fallback;

export function parseListingFilters(
  params: Record<string, string | string[] | undefined>, kind: "albums" | "tracks",
): ListingFilters {
  const status = kind === "albums"
    ? choice(first(params.status), ["all", "complete", "partial", "none"], "all")
    : choice(first(params.status), ["all", "synced", "unsynced", "failed"], "all");
  const sort = kind === "albums"
    ? choice(first(params.sort), ["title", "artist", "year"], "title")
    : choice(first(params.sort), ["title", "artist", "album"], "title");
  const rawPage = Number(first(params.page));
  return {
    q: first(params.q).trim().slice(0, 200),
    status,
    sort,
    page: Number.isSafeInteger(rawPage) && rawPage > 0 ? Math.min(rawPage, 1_000_000) : 1,
  };
}

const contains = (column: SQL | AnyColumn, value: string) =>
  // Escape SQL LIKE wildcards, so a literal '%' search is not a match-all.
  sql`lower(${column}) like ${`%${value.toLowerCase().replaceAll("!", "!!").replaceAll("%", "!%").replaceAll("_", "!_")}%`} escape '!'`;

function albumAggregate(libraryUuid: string) {
  return db.select({
    uuid: albums.uuid,
    title: albums.title,
    image: albums.image,
    year: albums.year,
    // Explicit SQL alias is needed in this subquery: albums also has a `title`
    // column, and the outer query must distinguish the two.
    artistTitle: sql<string | null>`${artists.title}`.as("artist_title"),
    trackCount: sql<number>`count(${tracks.key})`.as("track_count"),
    syncedTracks: sql<number>`coalesce(sum(case when ${tracks.synced} then 1 else 0 end), 0)`.as("synced_tracks"),
  }).from(albums)
    .leftJoin(artists, and(eq(artists.uuid, albums.artistUuid), eq(artists.libraryUuid, libraryUuid)))
    .leftJoin(tracks, and(eq(tracks.albumUuid, albums.uuid), eq(tracks.libraryUuid, libraryUuid)))
    .where(eq(albums.libraryUuid, libraryUuid))
    .groupBy(albums.uuid).as("album_listing");
}

function albumConditions(row: ReturnType<typeof albumAggregate>, filters: ListingFilters): SQL | undefined {
  const q = filters.q ? or(contains(row.title, filters.q), contains(sql`coalesce(${row.artistTitle}, '')`, filters.q)) : undefined;
  const status = filters.status === "complete"
    ? sql`${row.trackCount} > 0 and ${row.syncedTracks} = ${row.trackCount}`
    : filters.status === "partial"
      ? sql`${row.syncedTracks} > 0 and ${row.syncedTracks} < ${row.trackCount}`
      : filters.status === "none" ? sql`${row.syncedTracks} = 0` : undefined;
  return and(q, status);
}

export async function getAlbumListing(libraryUuid: string, filters: ListingFilters) {
  const rows = albumAggregate(libraryUuid);
  const where = albumConditions(rows, filters);
  const order = filters.sort === "artist"
    ? [asc(sql`lower(coalesce(${rows.artistTitle}, ''))`), asc(sql`lower(${rows.title})`)]
    : filters.sort === "year"
      ? [desc(sql`coalesce(${rows.year}, 0)`), asc(sql`lower(${rows.title})`)]
      : [asc(sql`lower(${rows.title})`), asc(sql`lower(coalesce(${rows.artistTitle}, ''))`)];
  const [totalRows, items] = await Promise.all([
    db.select({ n: sql<number>`count(*)` }).from(rows).where(where),
    db.select().from(rows).where(where).orderBy(...order, asc(rows.uuid))
      .limit(ALBUM_PAGE_SIZE).offset((filters.page - 1) * ALBUM_PAGE_SIZE),
  ]);
  return {
    items: items.map(item => ({ ...item, trackCount: Number(item.trackCount), syncedTracks: Number(item.syncedTracks) })),
    total: Number(totalRows[0]?.n ?? 0),
  };
}

function trackConditions(libraryUuid: string, filters: ListingFilters): SQL | undefined {
  const q = filters.q
    ? or(contains(tracks.title, filters.q),
      sql`exists (select 1 from artists where artists.uuid = ${tracks.artistUuid} and ${contains(sql`artists.title`, filters.q)})`,
      sql`exists (select 1 from albums where albums.uuid = ${tracks.albumUuid} and ${contains(sql`albums.title`, filters.q)})`)
    : undefined;
  const status = filters.status === "synced" ? eq(tracks.synced, true)
    : filters.status === "unsynced" ? and(eq(tracks.synced, false), ne(tracks.syncStatus, "error"))
      : filters.status === "failed" ? and(eq(tracks.synced, false), eq(tracks.syncStatus, "error"))
        : undefined;
  return and(eq(tracks.libraryUuid, libraryUuid), q, status);
}

export async function getTrackListing(libraryUuid: string, filters: ListingFilters) {
  const where = trackConditions(libraryUuid, filters);
  const order = filters.sort === "artist" ? [asc(sql`lower(coalesce(${artists.title}, ''))`), asc(sql`lower(${tracks.title})`)]
    : filters.sort === "album" ? [asc(sql`lower(coalesce(${albums.title}, ''))`), asc(tracks.trackNumber)]
      : [asc(sql`lower(${tracks.title})`)];

  const [totalRows, items] = await Promise.all([
    db.select({ n: sql<number>`count(*)` }).from(tracks).where(where),
    db.select({
      key: tracks.key, title: tracks.title, duration: tracks.duration,
      albumUuid: tracks.albumUuid, artistTitle: artists.title, albumTitle: albums.title,
      syncStatus: tracks.syncStatus, synced: tracks.synced,
    }).from(tracks)
      .leftJoin(artists, and(eq(artists.uuid, tracks.artistUuid), eq(artists.libraryUuid, libraryUuid)))
      .leftJoin(albums, and(eq(albums.uuid, tracks.albumUuid), eq(albums.libraryUuid, libraryUuid)))
      .where(where).orderBy(...order, asc(tracks.key))
      .limit(TRACK_PAGE_SIZE).offset((filters.page - 1) * TRACK_PAGE_SIZE),
  ]);
  const keys = items.map(item => item.key);
  const recentJobs = keys.length === 0 ? [] : await db.select({
    key: jobs.targetUuid, status: jobs.status, error: jobs.error,
  }).from(jobs).where(and(eq(jobs.kind, "sync_track"), inArray(jobs.targetUuid, keys)))
    .orderBy(desc(jobs.id));
  const jobByKey = new Map<string, typeof recentJobs[number]>();
  for (const job of recentJobs) {
    if (job.key && !jobByKey.has(job.key)) jobByKey.set(job.key, job);
  }
  return {
    items: items.map(item => ({ ...item,
      syncing: ["queued", "running"].includes(jobByKey.get(item.key)?.status ?? ""),
      error: jobByKey.get(item.key)?.status === "failed" ? jobByKey.get(item.key)?.error : null,
    })),
    total: Number(totalRows[0]?.n ?? 0),
  };
}

/** Shared selection for preview counts and enqueue: filters apply before pagination. */
export function eligibleTrackSelection(libraryUuid: string, kind: ListingKind, filters: ListingFilters) {
  let scope: SQL | undefined;
  if (kind === "albums") {
    const matchingAlbums = albumAggregate(libraryUuid);
    scope = inArray(tracks.albumUuid,
      db.select({ uuid: matchingAlbums.uuid }).from(matchingAlbums).where(albumConditions(matchingAlbums, filters)));
  } else if (kind === "tracks") {
    scope = trackConditions(libraryUuid, filters);
  }
  return db.select({ key: tracks.key }).from(tracks).where(and(
    eq(tracks.libraryUuid, libraryUuid), scope, eq(tracks.synced, false),
    notExists(db.select({ id: jobs.id }).from(jobs).where(and(
      eq(jobs.kind, "sync_track"), eq(jobs.targetUuid, tracks.key),
      inArray(jobs.status, ["queued", "running"]),
    ))),
  ));
}
