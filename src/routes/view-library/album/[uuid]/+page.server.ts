import type { InferredSelectAlbumSchema, InferredSelectArtistSchema, InferredSelectTrackSchema, ServerLoadValues } from "$lib/types";

import { albums, artists } from "$lib/schema";
import db from "$lib/server/db";
import { getAllTracksFromAlbumInLibrary, markAlbumAsSynced } from "$lib/server/db/query-utils";
import { and, eq } from "drizzle-orm";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ parent, params }) => {
  const returnData: {
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
  if (currentLibrary) {
    const returnedAlbum: InferredSelectAlbumSchema | undefined = await db.query.albums.findFirst({
      where: and(eq(albums.uuid, params.uuid), eq(albums.library, currentLibrary.uuid)),
    });
    if (returnedAlbum) {
      const returnedArtist: InferredSelectArtistSchema | undefined = await db.query.artists.findFirst({
        where: and(eq(artists.uuid, returnedAlbum.artist), eq(artists.library, currentLibrary.uuid)),
      });
      returnData.returnedArtist = returnedArtist;
    }
    const returnedTracks: Array<InferredSelectTrackSchema> = await getAllTracksFromAlbumInLibrary(currentLibrary.uuid, params.uuid);

    if (returnedTracks && returnedAlbum && !returnedAlbum.synced) {
      const tracksSynced: number = returnedTracks.reduce((acc, e) => {
        if (e.synced) {
          return acc + 1;
        }
        else {
          return acc;
        }
      }, 0);

      if (returnedTracks.length === tracksSynced) {
        markAlbumAsSynced(returnedAlbum.uuid, currentLibrary.uuid);
        returnData.invalidateData = true;
      };
    }

    returnData.returnedAlbum = returnedAlbum;
    returnData.returnedTracks = returnedTracks;
  }
  return returnData;
};
