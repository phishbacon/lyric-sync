import type { InferredSelectAlbumSchema, InferredSelectTrackSchema, ServerLoadValues } from "$lib/types";

import { albums } from "$lib/schema";
import db from "$lib/server/db";
import { getAllTracksFromAlbumInLibrary } from "$lib/server/db/query-utils";
import { eq } from "drizzle-orm";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ parent, params }) => {
  const returnData: {
    returnedAlbum: InferredSelectAlbumSchema | undefined;
    returnedTracks: Array<InferredSelectTrackSchema> | undefined;
  } = {
    returnedAlbum: undefined,
    returnedTracks: undefined,
  };
  const { currentLibrary }: ServerLoadValues = await parent();
  if (currentLibrary) {
    const returnedAlbum: InferredSelectAlbumSchema | undefined = await db.query.albums.findFirst({
      where: eq(albums.uuid, params.uuid),
    });
    const returnedTracks: Array<InferredSelectTrackSchema> = await getAllTracksFromAlbumInLibrary(currentLibrary.uuid, params.uuid);

    returnData.returnedAlbum = returnedAlbum;
    returnData.returnedTracks = returnedTracks;
  }
  return returnData;
};
