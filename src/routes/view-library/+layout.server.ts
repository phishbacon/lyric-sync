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

    // this is to mitigate weird skeleton ui v3 bug with cards
    returnData.returnedArtists.unshift({
      title: "",
      uuid: "",
      image: "",
      key: "",
      synced: false,
      library: "hide_me",
      summary: null,
      createdAt: null,
      updatedAt: null,
      totalAlbums: 1,
      albumsSynced: 0,
    });
  }

  return returnData;
};
