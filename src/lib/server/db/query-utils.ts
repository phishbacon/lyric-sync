import type { InferredInsertLibrarySchema, InferredSelectAlbumSchema, InferredSelectArtistSchema, InferredSelectLibrarySchema, InferredSelectTrackSchema, LibraryItems } from "$lib/types";

import { logger } from "$lib/logger";
import { albums, artists, libraries, tracks } from "$lib/schema";
import { eq, sql, type SQL } from "drizzle-orm";

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

export async function getAristsAlbumsTracksForLibrary(library: InferredSelectLibrarySchema): Promise<LibraryItems> {
  const returnedArtists: Array<InferredSelectArtistSchema> | undefined = await db.query.artists.findMany({
    where: eq(artists.library, library.uuid),
  });

  logger.info(returnedArtists, "db artists");

  const returnedAlbums: Array<InferredSelectAlbumSchema> | undefined = await db.query.albums.findMany({
    where: eq(albums.library, library.uuid),
  });

  logger.info(returnedAlbums, "db albums");

  const returnedTracks: Array<InferredSelectTrackSchema> | undefined = await db.query.tracks.findMany({
    where: eq(tracks.library, library.uuid),
  });

  logger.info(returnedTracks, "db tracks");

  return {
    returnedArtists,
    returnedAlbums,
    returnedTracks,
  };
}
