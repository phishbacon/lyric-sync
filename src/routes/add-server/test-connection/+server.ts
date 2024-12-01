import type { RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = async ({ url }) => {
  const hostname = url.searchParams.get("hostname");
  const port = url.searchParams.get("port");
  const xPlexToken = url.searchParams.get("X-Plex-Token");
  const URL = `${hostname}:${port}/?X-Plex-Token=${xPlexToken}`;
  let connection = false;

  try {
    const response = await fetch(URL, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      connection = false;
    }

    const data = await response.json();
    if (data.MediaContainer) {
      connection = true;
    }
    else {
      connection = false;
    }
  }
  catch {
    connection = false;
  }

  return new Response(JSON.stringify({ connection }));
};
