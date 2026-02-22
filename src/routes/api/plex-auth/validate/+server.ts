import type { RequestHandler } from "@sveltejs/kit";
import type { PlexValidateApiResponse } from "$lib/types";

import { logger } from "$lib/logger";
import db from "$lib/server/db";
import { validateToken } from "$lib/server/plex-auth";

export const GET: RequestHandler = async () => {
  try {
    const serverConfiguration = await db.query.servers.findFirst();

    if (!serverConfiguration) {
      const response: PlexValidateApiResponse = { valid: false };
      return new Response(JSON.stringify(response));
    }

    const valid = await validateToken(
      serverConfiguration.xPlexToken,
      serverConfiguration.clientIdentifier,
    );

    const response: PlexValidateApiResponse = { valid };
    return new Response(JSON.stringify(response));
  }
  catch (error) {
    logger.error(`Error validating Plex token: ${error}`);
    const response: PlexValidateApiResponse = { valid: false };
    return new Response(JSON.stringify(response));
  }
};
