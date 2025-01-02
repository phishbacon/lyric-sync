import type { LibraryItems, ServerLoadDefaultValues } from "$lib/types";

import { getAristsAlbumsTracksForLibrary } from "$lib/server/db/query-utils";

import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ parent }) => {
  const { currentLibrary }: ServerLoadDefaultValues = await parent();
  if (currentLibrary) {
    return await getAristsAlbumsTracksForLibrary(currentLibrary);
  }
  else {
    return {
      returnedArtists: undefined,
      returnedAlbums: undefined,
      returnedTracks: undefined,
    };
  }
};
