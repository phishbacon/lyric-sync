import type { ServerLoadValues, ViewLibraryServerLoadValues } from "$lib/types";

import { getAristsAlbumsTracksForLibrary } from "$lib/server/db/query-utils";

import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ parent }) => {
  const returnData: ViewLibraryServerLoadValues = {
    serverConfiguration: undefined,
    libraries: [],
    currentLibrary: undefined,
    returnedArtists: undefined,
    returnedAlbums: undefined,
    returnedTracks: undefined,
  };

  const { serverConfiguration, libraries, currentLibrary }: ServerLoadValues = await parent();

  returnData.serverConfiguration = serverConfiguration;
  returnData.libraries = libraries;
  returnData.currentLibrary = currentLibrary;

  if (returnData.currentLibrary) {
    const { returnedArtists, returnedAlbums, returnedTracks } = await getAristsAlbumsTracksForLibrary(returnData.currentLibrary);

    returnData.returnedArtists = returnedArtists;
    returnData.returnedAlbums = returnedAlbums;
    returnData.returnedTracks = returnedTracks;
  }

  return returnData;
};
