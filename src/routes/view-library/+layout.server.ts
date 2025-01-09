import type { InferredSelectArtistSchema, ServerLoadValues, ViewLibraryServerLoadValues } from "$lib/types";

import { getAllArtistsInLibrary } from "$lib/server/db/query-utils";

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
    const returnedArtists: Array<InferredSelectArtistSchema> = await getAllArtistsInLibrary(returnData.currentLibrary.uuid);

    returnData.returnedArtists = returnedArtists;
  }

  return returnData;
};
