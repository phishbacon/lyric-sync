import type { RequestHandler } from "@sveltejs/kit";
import type { InferredSelectTrackSchema, LRCResponse, SyncTrackResponse } from "$lib/types";

import { LrcLibApi } from "$lib/external-links";
import { logger } from "$lib/logger";
import { markTrackAsSynced } from "$lib/server/db/query-utils";
import fs from "node:fs/promises";
import path from "node:path";

export const POST: RequestHandler = async ({ request }) => {
  const syncTrackResponse: SyncTrackResponse = {
    synced: false,
    plainLyrics: true,
    message: "",
  };
  const { library, artistName, albumName, track }: {
    library: string;
    artistName: string;
    albumName: string;
    track: InferredSelectTrackSchema;
  } = await request.json();

  const lrcGetUrl: string = `${LrcLibApi}artist_name=${encodeURIComponent(artistName)}&track_name=${encodeURIComponent(track.title)}&album_name=${encodeURIComponent(albumName)}&duration=${track.duration / 1000}`;

  const lyricResponse: Response = await fetch(lrcGetUrl);

  logger.info(`Searching for lyrics ${lrcGetUrl}`);
  if (lyricResponse.ok) {
    const lyricResponseJson: LRCResponse = await lyricResponse.json();
    if (lyricResponseJson.syncedLyrics) {
      // write string to lrc file
      const lrcPath: string = `${path.dirname(track.path)}/${path.parse(track.path).name}.lrc`;

      try {
        await fs.writeFile(lrcPath, lyricResponseJson.syncedLyrics);
        syncTrackResponse.synced = true;
        syncTrackResponse.plainLyrics = false;
        // TODO: Error handling at every step of the process
        markTrackAsSynced(track.uuid, library);
        syncTrackResponse.message = `LRC lyrics grabbed for ${track.title}`;
      }
      catch (error: unknown) {
        if (error instanceof Error) {
          syncTrackResponse.message = error.message;
          syncTrackResponse.stack = error.stack;
        }
      }
    }
    else if (lyricResponseJson.plainLyrics) {
      // write string to txt file
      const lrcPath: string = `${path.dirname(track.path)}/${path.parse(track.path).name}.txt`;
      try {
        await fs.writeFile(lrcPath, lyricResponseJson.plainLyrics);
        syncTrackResponse.synced = true;
        syncTrackResponse.plainLyrics = true;
        markTrackAsSynced(track.uuid, library);
        syncTrackResponse.message = `Txt lyrics grabbed for ${track.title}`;
      }
      catch (error: unknown) {
        if (error instanceof Error) {
          syncTrackResponse.message = error.message;
          syncTrackResponse.stack = error.stack;
        }
      }
    }
    else {
      syncTrackResponse.message = `${track.title} has an entry in the lrclib api but no lyrics. Perhaps we can contribute some to lrclib.net?`;
    }
  }
  else {
    // make response saying we couldn't get lyrics from the provider
    syncTrackResponse.message = `No lyrics found for ${track.title}`;
    logger.info(`No lyrics found for ${track.title}`);
  }

  return new Response(JSON.stringify(syncTrackResponse));
};

