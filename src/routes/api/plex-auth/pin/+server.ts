import type { RequestHandler } from "@sveltejs/kit";
import type { PlexPinApiResponse } from "$lib/types";

import { logger } from "$lib/logger";
import { buildAuthUrl, createPin } from "$lib/server/plex-auth";
import { randomUUID } from "node:crypto";

export const POST: RequestHandler = async () => {
  const clientId = randomUUID();

  try {
    const pin = await createPin(clientId);
    const authUrl = buildAuthUrl(clientId, pin.pinCode);

    const response: PlexPinApiResponse = {
      pinId: pin.pinId,
      pinCode: pin.pinCode,
      clientId,
      authUrl,
    };

    return new Response(JSON.stringify(response));
  }
  catch (error) {
    logger.error(`Error creating Plex PIN: ${error}`);
    return new Response(JSON.stringify({
      message: "Failed to create Plex PIN",
    }), { status: 500 });
  }
};
