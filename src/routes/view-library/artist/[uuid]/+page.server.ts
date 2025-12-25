import type { AlbumWithTrackCount, ServerLoadValues } from "$lib/types";

import { getAllAlbumsFromArtistInLibraryWithTrackCounts } from "$lib/server/db/query-utils";
import { decodePlexID } from "$lib/uuid-encoder";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ parent, params }) => {
  const decodedPlexID = decodePlexID(params.uuid);

  const returnData: {
    returnedAlbums: Array<AlbumWithTrackCount> | undefined;
  } = {
    returnedAlbums: undefined,
  };
  const { currentLibrary }: ServerLoadValues = await parent();
  if (currentLibrary) {
    const returnedAlbums: Array<AlbumWithTrackCount> = await getAllAlbumsFromArtistInLibraryWithTrackCounts(currentLibrary.uuid, decodedPlexID);
    returnData.returnedAlbums = returnedAlbums;
  }
  return returnData;
};
