import type { InferredSelectAlbumSchema, InferredSelectArtistSchema, InferredSelectTrackSchema, ServerLoadValues } from "$lib/types";

import { albums, artists } from "$lib/schema";
import db from "$lib/server/db";
import { getAllTracksFromAlbumInLibrary, markAlbumAsSynced } from "$lib/server/db/query-utils";
import { and, eq } from "drizzle-orm";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ depends, parent, params }) => {
  depends("data:viewLibraryAlbumReturnData");
  const viewLibraryAlbumReturnData: {
    returnedArtist: InferredSelectArtistSchema | undefined;
    returnedAlbum: InferredSelectAlbumSchema | undefined;
    returnedTracks: Array<InferredSelectTrackSchema> | undefined;
    invalidateData: boolean;
  } = {
    returnedArtist: undefined,
    returnedAlbum: undefined,
    returnedTracks: undefined,
    invalidateData: false,
  };
  const { currentLibrary }: ServerLoadValues = await parent();

  // get the album
  if (currentLibrary) {
    const returnedAlbum: InferredSelectAlbumSchema | undefined = await db.query.albums.findFirst({
      where: and(eq(albums.uuid, params.uuid), eq(albums.library, currentLibrary.uuid)),
    });
    // get the artist
    // this is for querying lrc for the lyrics
    // we could just query the db for the album's artist in api/sync-lyrics/track instead
    if (returnedAlbum) {
      const returnedArtist: InferredSelectArtistSchema | undefined = await db.query.artists.findFirst({
        where: and(eq(artists.uuid, returnedAlbum.artist), eq(artists.library, currentLibrary.uuid)),
      });
      viewLibraryAlbumReturnData.returnedArtist = returnedArtist;
    }
    // get the tracks in the album
    const returnedTracks: Array<InferredSelectTrackSchema> = await getAllTracksFromAlbumInLibrary(currentLibrary.uuid, params.uuid);

    // if the album isn't marked as synced then check if we can mark it as such
    if (returnedTracks && returnedAlbum && !returnedAlbum.synced) {
      const tracksSynced: number = returnedTracks.reduce((acc, e) => {
        if (e.synced) {
          return acc + 1;
        }
        else {
          return acc;
        }
      }, 0);

      // sync it and set invalidate flag so we know to invalidateAll when the page loads
      if (returnedTracks.length === tracksSynced) {
        markAlbumAsSynced(returnedAlbum.uuid, currentLibrary.uuid);
        viewLibraryAlbumReturnData.invalidateData = true;
      };
    }

    viewLibraryAlbumReturnData.returnedAlbum = returnedAlbum;
    viewLibraryAlbumReturnData.returnedTracks = returnedTracks;
  }
  return viewLibraryAlbumReturnData;
};
