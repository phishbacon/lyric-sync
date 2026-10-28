import { z } from "zod";

export const librarySectionSchema = z.object({
  key: z.string(),
  uuid: z.string(),
  title: z.string(),
  type: z.string(),
  hidden: z.coerce.boolean().optional(),
  composite: z.string().optional(),
  Location: z.array(z.object({
    path: z.string(),
  })).optional(),
});

export const librarySectionsResponseSchema = z.object({
  Directory: z.array(librarySectionSchema).optional(),
});

export const plexIdentitySchema = z.object({
  MediaContainer: z.object({}).loose(),
});

export class PlexApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "PlexApiError";
  }
}

export interface PlexServerConfig {
  baseUrl: string;
  token: string;
  clientIdentifier: string;
}

async function plexFetch(
  config: PlexServerConfig,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const url = new URL(path, config.baseUrl);
  url.searchParams.set("X-Plex-Token", config.token);

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        "Accept": "application/json",
        "X-Plex-Product": "Lyric-Sync",
        "X-Plex-Client-Identifier": config.clientIdentifier,
        ...init?.headers,
      },
    });
  }
  catch (cause) {
    throw new PlexApiError(`Cannot reach Plex server at ${config.baseUrl}: ${String(cause)}`);
  }

  if (response.status === 401) {
    throw new PlexApiError("Plex authentication expired", 401);
  }

  return response;
}

export async function testConnection(config: PlexServerConfig): Promise<boolean> {
  const response = await plexFetch(config, "/");
  if (!response.ok) {
    throw new PlexApiError(
      `Plex server responded with ${response.status} ${response.statusText}`,
      response.status,
    );
  }
  const data = plexIdentitySchema.parse(await response.json());
  return "MediaContainer" in data;
}

export async function listMusicLibraries(
  config: PlexServerConfig,
): Promise<Array<z.infer<typeof librarySectionSchema>>> {
  const response = await plexFetch(config, "/library/sections");
  if (!response.ok) {
    throw new PlexApiError(
      `Failed to list libraries: ${response.status} ${response.statusText}`,
      response.status,
    );
  }
  const data = librarySectionsResponseSchema.parse(await response.json());
  return (data.Directory ?? []).filter(
    section => section.type === "artist" && !section.hidden,
  );
}
