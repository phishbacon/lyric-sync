import type { RequestHandler } from "@sveltejs/kit";
import type { Root } from "$lib/plex-api-types";
import type { TestConnectionResponse } from "$lib/types";

import { logger } from "$lib/logger";

export const POST: RequestHandler = async ({ request }) => {
  const { hostname, port, xPlexToken }: {
    hostname: string;
    port: string;
    xPlexToken: string;
  } = await request.json();
  const URL: string = `${hostname}:${port}/?X-Plex-Token=${xPlexToken}`;
  const testConnectionResponse: TestConnectionResponse = {
    connection: false,
    message: "",
  };

  logger.info(`Testing Plex Connection with ${URL}`);

  try {
    const response: Response = await fetch(URL, {
      headers: {
        Accept: "application/json",
      },
    });

    if (response.ok) {
      logger.debug(response);
      const data: Root = await response.json();
      if (data.MediaContainer) {
        testConnectionResponse.connection = true;
        testConnectionResponse.message = "Connection Established";
      }
      else {
        testConnectionResponse.connection = false;
        testConnectionResponse.message = "No MediaContainers returned from server";
      }
      logger.info(testConnectionResponse.message);
    }
    else {
      throw new Error(`${response.status}: ${response.statusText}`, { cause: "HTTP ERROR" });
    }
  }
  catch (error: unknown) {
    testConnectionResponse.connection = false;
    if (error instanceof Error) {
      if (error.cause === "HTTP ERROR") {
        testConnectionResponse.message = error.message;
      }
      else if (error.stack) {
        testConnectionResponse.message = error.stack;
      }
    }
    logger.error(testConnectionResponse.message);
  }

  return new Response(JSON.stringify(testConnectionResponse));
};
