import type { RequestHandler } from "@sveltejs/kit";
import type { CheckTrackLyricsOnDiskResponse, InferredSelectTrackSchema } from "$lib/types";

import { logger } from "$lib/logger";
import { tracks } from "$lib/schema";
import db from "$lib/server/db";
import { and, eq, sql } from "drizzle-orm";
import { toSnakeCase } from "drizzle-orm/casing";
import fs from "node:fs/promises";
import path from "node:path";
// this function will look in the file system for each tracks path
// if there is an lrc file matching the path, then we will consider it synced
// and update the db
export const GET: RequestHandler = async ({ url }) => {
  const { library, track }: {
    library: string;
    track: string;
  } = {
    library: url.searchParams.get("library") ?? "",
    track: url.searchParams.get("track") ?? "",
  };

  const checkTrackResponse: CheckTrackLyricsOnDiskResponse = {
    lyricsExist: false,
    plainLyrics: true,
    message: "Lyrics not on disk",
  };

  if (library && track) {
    logger.info(`Grabbing track path for Track: ${track} in Library: ${library}`);
    const trackResponse: InferredSelectTrackSchema | undefined = await db.query.tracks.findFirst({
      where: and(eq(tracks.uuid, track), eq(tracks.library, library)),
    });
    if (trackResponse) {
      const txtPath: string = `${path.dirname(trackResponse.path)}/${path.parse(trackResponse.path).name}.txt`;
      const lrcPath: string = `${path.dirname(trackResponse.path)}/${path.parse(trackResponse.path).name}.lrc`;
      logger.info(`Checking for lrc or txt at ${lrcPath}`);

      try {
        await fs.readFile(lrcPath);
        checkTrackResponse.lyricsExist = true;
        checkTrackResponse.plainLyrics = false;
        checkTrackResponse.message = `Lyrics on disk for ${trackResponse.title}`;
        logger.info(`Lrc found ${lrcPath} marking as synced`);
        trackResponse.synced = true;
      }
      catch {
        trackResponse.synced = false;
        logger.info(`No lrc found ${lrcPath} marking as unsynced`);
        checkTrackResponse.message = `Lyrics not on disk for ${trackResponse.title}. Marking as unsynced`;
      }

      // if we didn't find an lrc file, then check for a txt file
      if (!checkTrackResponse.lyricsExist) {
        try {
          await fs.readFile(txtPath);
          checkTrackResponse.lyricsExist = true;
          checkTrackResponse.plainLyrics = true;
          checkTrackResponse.message = `Lyrics on disk for ${trackResponse.title}`;
          logger.info(`Txt found ${txtPath}`);
          trackResponse.synced = true;
        }
        catch {
          trackResponse.synced = false;
          logger.info(`No txt found ${txtPath} marking as unsynced`);
          checkTrackResponse.message = `Lyrics not on disk for ${trackResponse.title}. Marking as unsynced`;
        }
      }

      await db.insert(tracks).values(trackResponse).onConflictDoUpdate({
        target: tracks.uuid,
        set: {
          synced: sql.raw(`excluded.${toSnakeCase(tracks.synced.name)}`),
        },
      }).returning();
      ;
    }
  }
  else {
    checkTrackResponse.message = "Missing library or track UUID in request";
  }

  return new Response(JSON.stringify(checkTrackResponse));
};
