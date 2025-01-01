import type { RequestHandler } from "@sveltejs/kit";
import type { Root } from "$lib/plex-api-types";
import type { TestConnectionResponse } from "$lib/types";

import { logger } from "$lib/logger";

export const GET: RequestHandler = async ({ url }) => {
  const hostname: string = url.searchParams.get("hostname") ?? "http://localhost";
  const port: string = url.searchParams.get("port") ?? "32400";
  const xPlexToken: string = url.searchParams.get("X-Plex-Token") ?? "1234";
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
