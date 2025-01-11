import type { ArtistWithAlbumCount, InferredInsertLibrarySchema, InferredSelectAlbumSchema, InferredSelectArtistSchema, InferredSelectTrackSchema, LibraryItems } from "$lib/types";

import { logger } from "$lib/logger";
import { albums, artists, libraries, tracks } from "$lib/schema";
import { and, asc, eq, getTableColumns, sql, type SQL } from "drizzle-orm";

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

  logger.info(returnedArtists, `returning all artists in library ${libraryUUID}`);

  return returnedArtists;
};

export async function getAllArtistsInLibraryWithAlbumCounts(libraryUUID: string): Promise<Array<ArtistWithAlbumCount>> {
  const returnedArtists: Array<ArtistWithAlbumCount> = await db.select({
    ...getTableColumns(artists),
    totalAlbums: sql<number>`COUNT(${albums.uuid})`,
    albumsSynced: sql<number>`SUM(CASE WHEN ${albums.synced} = 1 THEN 1 ELSE 0 END)`,
  }).from(artists).leftJoin(albums, sql`${albums.artist} = ${artists.uuid}`).where(eq(artists.library, libraryUUID)).groupBy(artists.uuid).orderBy(asc(sql`LOWER(${artists.title})`));

  logger.info(returnedArtists, `returning all artists in library ${libraryUUID}`);

  return returnedArtists;
};

export async function getAllAlbumsInLibrary(libraryUUID: string): Promise<Array<InferredSelectAlbumSchema>> {
  const returnedAlbums: Array<InferredSelectAlbumSchema> | undefined = await db.query.albums.findMany({
    where: eq(albums.library, libraryUUID),
  });

  logger.info(returnedAlbums, `returning all albums in library ${libraryUUID}`);

  return returnedAlbums;
};

export async function getAllTracksInLibrary(libraryUUID: string): Promise<Array<InferredSelectTrackSchema>> {
  const returnedTracks: Array<InferredSelectTrackSchema> | undefined = await db.query.tracks.findMany({
    where: eq(tracks.library, libraryUUID),
  });

  logger.info(returnedTracks, `returning all tracks in library ${libraryUUID}`);

  return returnedTracks;
};

export async function getAllAlbumsFromArtistInLibrary(libraryUUID: string, artistUUID: string): Promise<Array<InferredSelectAlbumSchema>> {
  const returnedAlbums: Array<InferredSelectAlbumSchema> | undefined = await db.query.albums.findMany({
    where: and(eq(albums.library, libraryUUID), eq(albums.artist, artistUUID)),
  });

  logger.info(returnedAlbums, `returning albums from artist: ${artistUUID} in library ${libraryUUID}`);

  return returnedAlbums;
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
