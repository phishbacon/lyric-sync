import type { AlbumWithTrackCount, ArtistWithAlbumCount, InferredInsertLibrarySchema, InferredSelectAlbumSchema, InferredSelectArtistSchema, InferredSelectTrackSchema, LibraryItems } from "$lib/types";
import type { SQL } from "drizzle-orm";

import { logger } from "$lib/logger";
import { albums, artists, libraries, tracks } from "$lib/schema";
import { and, asc, eq, getTableColumns, sql } from "drizzle-orm";

import db from ".";

// create an update many sql statement for use with db.update.set()
// please don't pass an empty array to this function
export function updateAllCurrentLibraryValuesToFalseExceptOne(inputs: Array<InferredInsertLibrarySchema>): { sql: SQL; uuids: Array<string> } {
  const sqlChunks: Array<SQL> = [];
  const ids: Array<string> = [];

  sqlChunks.push(sql`(case`);

  for (const input of inputs) {
    if (input.currentLibrary) {
      sqlChunks.push(sql`when ${libraries.uuid} = ${input.uuid} then true`);
    }
    else {
      sqlChunks.push(sql`when ${libraries.uuid} = ${input.uuid} then false`);
    }
    ids.push(input.uuid);
  }

  sqlChunks.push(sql`end)`);

  const finalSql: SQL = sql.join(sqlChunks, sql.raw(" "));
  return {
    sql: finalSql,
    uuids: ids,
  };
};

export async function getAllArtistsInLibrary(libraryUUID: string): Promise<Array<InferredSelectArtistSchema>> {
  const returnedArtists: Array<InferredSelectArtistSchema> | undefined = await db.query.artists.findMany({
    where: eq(artists.library, libraryUUID),
  });

  logger.info(`returning all artists in library ${libraryUUID}`);
  logger.debug(returnedArtists);

  return returnedArtists;
};

export async function getAllArtistsInLibraryWithAlbumCounts(libraryUUID: string): Promise<Array<ArtistWithAlbumCount>> {
  const returnedArtists: Array<ArtistWithAlbumCount> = await db.select({
    ...getTableColumns(artists),
    totalAlbums: sql<number>`COUNT(${albums.uuid})`,
    albumsSynced: sql<number>`SUM(CASE WHEN ${albums.synced} = 1 THEN 1 ELSE 0 END)`,
  }).from(artists).leftJoin(albums, sql`${albums.artist} = ${artists.uuid}`).where(eq(artists.library, libraryUUID)).groupBy(artists.uuid).orderBy(asc(sql`LOWER(${artists.title})`));

  logger.info(`returning all artists in library with album counts ${libraryUUID}`);
  logger.debug(returnedArtists);

  return returnedArtists;
};

export async function getAllAlbumsFromArtistInLibraryWithTrackCounts(libraryUUID: string, artistUUID: string): Promise<Array<AlbumWithTrackCount>> {
  const returnedAlbums: Array<AlbumWithTrackCount> = await db.select({
    ...getTableColumns(albums),
    totalTracks: sql<number>`COUNT(${tracks.uuid})`,
    tracksSynced: sql<number>`SUM(CASE WHEN ${tracks.synced} = 1 THEN 1 ELSE 0 END)`,
  }).from(albums).leftJoin(tracks, sql`${tracks.artist} = ${albums.artist} AND ${tracks.album} = ${albums.uuid}`).where(and(eq(tracks.library, libraryUUID), eq(tracks.artist, artistUUID))).groupBy(albums.uuid).orderBy(asc(sql`LOWER(${albums.title})`));

  logger.info(`returning albums from artist: ${artistUUID} in library ${libraryUUID}`);
  logger.debug(returnedAlbums);

  return returnedAlbums;
};

export async function getAllTracksFromAlbumInLibrary(libraryUUID: string, albumUUID: string): Promise<Array<InferredSelectTrackSchema>> {
  const returnedTracks: Array<InferredSelectTrackSchema> = await db.query.tracks.findMany({
    where: and(eq(tracks.album, albumUUID), eq(tracks.library, libraryUUID)),
    orderBy: [asc(tracks.trackNumber)],
  });

  logger.info(`retruning tracks from album: ${albumUUID} in library ${libraryUUID}`);
  logger.debug(returnedTracks);

  return returnedTracks;
};

export async function getAllAlbumsInLibrary(libraryUUID: string): Promise<Array<InferredSelectAlbumSchema>> {
  const returnedAlbums: Array<InferredSelectAlbumSchema> | undefined = await db.query.albums.findMany({
    where: eq(albums.library, libraryUUID),
  });

  logger.info(`returning all albums in library ${libraryUUID}`);
  logger.debug(returnedAlbums);

  return returnedAlbums;
};

export async function getAllTracksInLibrary(libraryUUID: string): Promise<Array<InferredSelectTrackSchema>> {
  const returnedTracks: Array<InferredSelectTrackSchema> | undefined = await db.query.tracks.findMany({
    where: eq(tracks.library, libraryUUID),
  });

  logger.info(`returning all tracks in library ${libraryUUID}`);
  logger.debug(returnedTracks);

  return returnedTracks;
};

export async function getAllArtistsAlbumsTracksInLibrary(libraryUUID: string): Promise<LibraryItems> {
  const returnedArtists: Array<InferredSelectArtistSchema> | undefined = await getAllArtistsInLibrary(libraryUUID);

  const returnedAlbums: Array<InferredSelectAlbumSchema> | undefined = await getAllAlbumsInLibrary(libraryUUID);

  const returnedTracks: Array<InferredSelectTrackSchema> | undefined = await getAllTracksInLibrary(libraryUUID);

  return {
    returnedArtists,
    returnedAlbums,
    returnedTracks,
  };
};

export async function markTrackAsSynced(trackUUID: string, libraryUUID: string): Promise<Array<InferredSelectTrackSchema>> {
  logger.info(`Attempting to mark track: ${trackUUID} in libary: ${libraryUUID} as SYNCED`);
  const returnedTrack: Array<InferredSelectTrackSchema> | undefined = await db.update(tracks).set({ synced: true }).where(and(eq(tracks.uuid, trackUUID), eq(tracks.library, libraryUUID))).returning();

  if (returnedTrack) {
    logger.info(`track: ${trackUUID} in library: ${libraryUUID} SYNCED`);
    logger.debug(returnedTrack);
  }

  return returnedTrack;
};

export async function markAlbumAsSynced(albumUUID: string, libraryUUID: string): Promise<Array<InferredSelectAlbumSchema>> {
  logger.info(`Attempting to mark album: ${albumUUID} in libary: ${libraryUUID} as SYNCED`);
  const returnedAlbum: Array<InferredSelectAlbumSchema> | undefined = await db.update(albums).set({ synced: true }).where(and(eq(albums.uuid, albumUUID), eq(albums.library, libraryUUID))).returning();

  if (returnedAlbum) {
    logger.info(`album: ${albumUUID} in library: ${libraryUUID} SYNCED`);
    logger.debug(returnedAlbum);
  }

  return returnedAlbum;
};
