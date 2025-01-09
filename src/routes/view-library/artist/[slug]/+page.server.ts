import type { InferredSelectAlbumSchema, ServerLoadValues } from "$lib/types";

import { getAllAlbumsFromArtistInLibrary } from "$lib/server/db/query-utils";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ parent, params }) => {
  const returnData: { returnedAlbums: Array<InferredSelectAlbumSchema> | undefined } = {
    returnedAlbums: undefined,
  };
  const { currentLibrary }: ServerLoadValues = await parent();
  if (currentLibrary) {
    returnData.returnedAlbums = await getAllAlbumsFromArtistInLibrary(currentLibrary.uuid, params.slug);
  }
  return returnData;
};
