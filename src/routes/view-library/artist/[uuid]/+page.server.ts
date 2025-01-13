import type { AlbumWithTrackCount, ServerLoadValues } from "$lib/types";

import { getAllAlbumsFromArtistInLibraryWithTrackCounts } from "$lib/server/db/query-utils";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ parent, params }) => {
  const returnData: {
    returnedAlbums: Array<AlbumWithTrackCount> | undefined;
  } = {
    returnedAlbums: undefined,
  };
  const { currentLibrary }: ServerLoadValues = await parent();
  if (currentLibrary) {
    const returnedAlbums: Array<AlbumWithTrackCount> = await getAllAlbumsFromArtistInLibraryWithTrackCounts(currentLibrary.uuid, params.uuid);

    // this is to mitigate weird skeleton ui v3 bug with cards
    returnedAlbums.unshift({
      title: "",
      uuid: "",
      image: "",
      key: "",
      synced: false,
      library: "hide_me",
      artist: "",
      summary: null,
      createdAt: null,
      updatedAt: null,
      totalTracks: 1,
      tracksSynced: 0,
    });

    returnData.returnedAlbums = returnedAlbums;
  }
  return returnData;
};
