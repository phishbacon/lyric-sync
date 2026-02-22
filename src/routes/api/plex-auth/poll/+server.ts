import type { RequestHandler } from "@sveltejs/kit";
import type { PlexPollApiResponse } from "$lib/types";

import { logger } from "$lib/logger";
import { checkPin } from "$lib/server/plex-auth";

export const GET: RequestHandler = async ({ url }) => {
  const pinId = url.searchParams.get("pinId");
  const pinCode = url.searchParams.get("pinCode");
  const clientId = url.searchParams.get("clientId");

  if (!pinId || !pinCode || !clientId) {
    return new Response(JSON.stringify({
      message: "Missing required query parameters: pinId, pinCode, clientId",
    }), { status: 400 });
  }

  try {
    const token = await checkPin(Number(pinId), pinCode, clientId);

    const response: PlexPollApiResponse = {
      authenticated: !!token,
      token: token ?? undefined,
    };

    return new Response(JSON.stringify(response));
  }
  catch (error) {
    logger.error(`Error polling Plex PIN: ${error}`);
    return new Response(JSON.stringify({
      authenticated: false,
    }));
  }
};
