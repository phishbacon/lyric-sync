import type { ArtistWithAlbumCount, ServerLoadValues } from "$lib/types";

import { getAllArtistsInLibraryWithAlbumCounts } from "$lib/server/db/query-utils";

import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ parent }) => {
  const returnData: { returnedArtists: Array<ArtistWithAlbumCount> | undefined } = {
    returnedArtists: undefined,
  };

  const { currentLibrary }: ServerLoadValues = await parent();

  if (currentLibrary) {
    returnData.returnedArtists = await getAllArtistsInLibraryWithAlbumCounts(currentLibrary.uuid);
  }

  return returnData;
};
