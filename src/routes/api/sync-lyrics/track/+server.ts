import type { RequestHandler } from "@sveltejs/kit";
import type { InferredSelectTrackSchema, SyncTrackResponse } from "$lib/types";

import { syncTrack } from "$lib/server/sync-track";

export const POST: RequestHandler = async ({ request }) => {
  const { library, artistName, albumName, track }: {
    library: string;
    artistName: string;
    albumName: string;
    track: InferredSelectTrackSchema;
  } = await request.json();

  const syncTrackResponse: SyncTrackResponse = await syncTrack(library, artistName, albumName, track);

  return new Response(JSON.stringify(syncTrackResponse));
};
