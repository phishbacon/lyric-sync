import type { RequestHandler } from "@sveltejs/kit";
import type { TestConnectionResponse } from "$lib/types";

export const GET: RequestHandler = async ({ url }) => {
  const hostname = url.searchParams.get("hostname");
  const port = url.searchParams.get("port");
  const xPlexToken = url.searchParams.get("X-Plex-Token");
  const URL = `${hostname}:${port}/?X-Plex-Token=${xPlexToken}`;
  const testConnectionResponse: TestConnectionResponse = {
    connection: false,
    message: "",
  };

  try {
    const response = await fetch(URL, {
      headers: {
        Accept: "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.MediaContainer) {
        testConnectionResponse.connection = true;
        testConnectionResponse.message = "Connection Established";
      }
      else {
        testConnectionResponse.connection = false;
        testConnectionResponse.message = "No MediaContainers returned from server";
      }
    }
    else {
      throw new Error(`${response.status}: ${await response.statusText}`, { cause: "HTTP ERROR" });
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
  }

  return new Response(JSON.stringify(testConnectionResponse));
};
