import type { RequestHandler } from "@sveltejs/kit";
import type { PlexUpdateTokenApiResponse } from "$lib/types";

import { logger } from "$lib/logger";
import { servers } from "$lib/schema";
import db from "$lib/server/db";
import { eq } from "drizzle-orm";

export const PATCH: RequestHandler = async ({ request }) => {
  try {
    const { token }: { token: string } = await request.json();

    if (!token) {
      const response: PlexUpdateTokenApiResponse = {
        updated: false,
        message: "Token is required",
      };
      return new Response(JSON.stringify(response), { status: 400 });
    }

    const serverConfiguration = await db.query.servers.findFirst();

    if (!serverConfiguration) {
      const response: PlexUpdateTokenApiResponse = {
        updated: false,
        message: "No server configuration found",
      };
      return new Response(JSON.stringify(response), { status: 404 });
    }

    await db.update(servers)
      .set({ xPlexToken: token })
      .where(eq(servers.id, serverConfiguration.id));

    logger.info("Plex auth token updated successfully");

    const response: PlexUpdateTokenApiResponse = {
      updated: true,
      message: "Token updated successfully",
    };
    return new Response(JSON.stringify(response));
  }
  catch (error) {
    logger.error(`Error updating Plex token: ${error}`);
    const response: PlexUpdateTokenApiResponse = {
      updated: false,
      message: "Failed to update token",
    };
    return new Response(JSON.stringify(response), { status: 500 });
  }
};
