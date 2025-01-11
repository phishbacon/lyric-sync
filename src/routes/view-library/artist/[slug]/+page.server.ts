import type { AlbumWithTrackCount, InferredSelectTrackSchema, ServerLoadValues } from "$lib/types";

import { getAllAlbumsFromArtistInLibraryWithTrackCounts } from "$lib/server/db/query-utils";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ parent, params }) => {
  const returnData: {
    returnedAlbums: Array<AlbumWithTrackCount> | undefined;
    returnedTracks: Array<InferredSelectTrackSchema> | undefined;
  } = {
    returnedAlbums: undefined,
    returnedTracks: undefined,
  };
  const { currentLibrary }: ServerLoadValues = await parent();
  if (currentLibrary) {
    returnData.returnedAlbums = await getAllAlbumsFromArtistInLibraryWithTrackCounts(currentLibrary.uuid, params.slug);
  }
  return returnData;
};
