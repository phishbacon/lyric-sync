import type { ArtistWithAlbumCount, ServerLoadValues, ViewLibraryServerLoadValues } from "$lib/types";

import { getAllArtistsInLibraryWithAlbumCounts } from "$lib/server/db/query-utils";

import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ parent }) => {
  const returnData: ViewLibraryServerLoadValues = {
    serverConfiguration: undefined,
    libraries: [],
    currentLibrary: undefined,
    returnedArtists: undefined,
  };

  const { serverConfiguration, libraries, currentLibrary }: ServerLoadValues = await parent();

  returnData.serverConfiguration = serverConfiguration;
  returnData.libraries = libraries;
  returnData.currentLibrary = currentLibrary;

  if (returnData.currentLibrary) {
    const returnedArtists: Array<ArtistWithAlbumCount> = await getAllArtistsInLibraryWithAlbumCounts(returnData.currentLibrary.uuid);

    // this is to mitigate weird skeleton ui v3 bug with cards
    returnedArtists.unshift({
      title: "",
      uuid: "",
      image: "",
      key: "",
      synced: false,
      library: "hide_me",
      summary: null,
      createdAt: null,
      updatedAt: null,
      totalAlbums: 0,
      albumsSynced: 0,
    });
    returnData.returnedArtists = returnedArtists;
  }

  return returnData;
};
