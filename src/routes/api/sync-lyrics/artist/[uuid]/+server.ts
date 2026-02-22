import type { RequestHandler } from "@sveltejs/kit";
import type { InferredSelectAlbumSchema, InferredSelectArtistSchema, InferredSelectLibrarySchema, InferredSelectTrackSchema } from "$lib/types";

import { logger } from "$lib/logger";
import { albums, artists, libraries, tracks } from "$lib/schema";
import db from "$lib/server/db";
import { syncTrack } from "$lib/server/sync-track";
import { and, eq } from "drizzle-orm";

export const POST: RequestHandler = async ({ params }) => {
  const { uuid: artistUUID } = params;

  const response = {
    success: false,
    message: "",
    syncedTracks: 0,
    totalTracks: 0,
  };

  if (!artistUUID) {
    response.message = "Artist UUID is required";
    return new Response(JSON.stringify(response), { status: 400 });
  }

  try {
    // Get the current library
    const currentLibrary: InferredSelectLibrarySchema | undefined = await db.query.libraries.findFirst({
      where: eq(libraries.currentLibrary, true),
    });

    if (!currentLibrary) {
      response.message = "No current library selected";
      return new Response(JSON.stringify(response));
    }

    // Get artist info
    const artist: InferredSelectArtistSchema | undefined = await db.query.artists.findFirst({
      where: and(eq(artists.uuid, artistUUID), eq(artists.library, currentLibrary.uuid)),
    });

    if (!artist) {
      response.message = "Artist not found";
      return new Response(JSON.stringify(response));
    }

    // Get all albums for this artist
    const albumsForArtist: Array<InferredSelectAlbumSchema> = await db.query.albums.findMany({
      where: and(eq(albums.artist, artistUUID), eq(albums.library, currentLibrary.uuid)),
    });

    if (!albumsForArtist || albumsForArtist.length === 0) {
      response.message = "No albums found for this artist";
      return new Response(JSON.stringify(response));
    }

    // Get all tracks for all albums
    const allTracks: Array<InferredSelectTrackSchema> = [];
    for (const album of albumsForArtist) {
      const tracksForAlbum: Array<InferredSelectTrackSchema> = await db.query.tracks.findMany({
        where: and(eq(tracks.album, album.uuid), eq(tracks.library, currentLibrary.uuid)),
      });
      allTracks.push(...tracksForAlbum);
    }

    response.totalTracks = allTracks.length;

    // Sync each track using the shared utility
    for (const track of allTracks) {
      try {
        const album = await db.query.albums.findFirst({
          where: and(eq(albums.uuid, track.album), eq(albums.library, currentLibrary.uuid)),
        });

        if (!album) {
          logger.warn(`Album not found for track ${track.uuid}`);
          continue;
        }

        const syncTrackResponse = await syncTrack(currentLibrary.uuid, artist.title, album.title, track);

        if (syncTrackResponse.synced) {
          response.syncedTracks++;
        }
      }
      catch (error: unknown) {
        logger.error(`Failed to sync track ${track.uuid}: ${error}`);
      }
    }

    response.success = true;
    response.message = `Successfully synced ${response.syncedTracks} out of ${response.totalTracks} tracks`;
  }
  catch (error: unknown) {
    logger.error(`Error syncing artist lyrics: ${error}`);
    response.message = "Error syncing artist lyrics";
  }

  return new Response(JSON.stringify(response));
};
