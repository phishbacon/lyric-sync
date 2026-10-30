import { z } from "zod";

export const librarySectionSchema = z.object({
  key: z.string(),
  uuid: z.string(),
  title: z.string(),
  type: z.string(),
  hidden: z.coerce.boolean().optional(),
  composite: z.string().optional(),
  Location: z.array(z.object({ path: z.string() })).optional(),
});

export const librarySectionsResponseSchema = z.object({
  MediaContainer: z
    .object({
      Directory: z.array(librarySectionSchema).optional(),
    })
    .loose(),
});

export const plexIdentitySchema = z.object({
  MediaContainer: z.object({}).loose(),
});

// Entities in /library/sections/{key}/all pages. The guid chain is the
// stable join key: track.parentGuid === album.guid, album.parentGuid ===
// artist.guid, matching how the tracks/artists/albums FKs are stored.
export const plexArtistSchema = z.object({
  key: z.string(),
  guid: z.string(),
  title: z.string(),
  summary: z.string().optional(),
  thumb: z.string().optional(),
  art: z.string().optional(),
});

export const plexAlbumSchema = z.object({
  key: z.string(),
  guid: z.string(),
  parentGuid: z.string(),
  title: z.string(),
  summary: z.string().optional(),
  thumb: z.string().optional(),
  art: z.string().optional(),
});

export const plexTrackSchema = z.object({
  key: z.string(),
  guid: z.string(),
  parentGuid: z.string(),
  grandparentGuid: z.string(),
  title: z.string(),
  index: z.number().optional(),
  duration: z.number().optional(),
  Media: z
    .array(
      z.object({
        Part: z
          .array(z.object({ file: z.string().optional(), duration: z.number().optional() }))
          .optional(),
      }),
    )
    .optional(),
});

export type PlexArtist = z.infer<typeof plexArtistSchema>;
export type PlexAlbum = z.infer<typeof plexAlbumSchema>;
export type PlexTrack = z.infer<typeof plexTrackSchema>;

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
        Accept: "application/json",
        "X-Plex-Product": "Lyric-Sync",
        "X-Plex-Client-Identifier": config.clientIdentifier,
        ...init?.headers,
      },
    });
  } catch (cause) {
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
  return (data.MediaContainer.Directory ?? []).filter(
    section => section.type === "artist" && !section.hidden,
  );
}

export const PLEX_PAGE_SIZE = 500;

export const plexSectionTypes = { artists: 8, albums: 9, tracks: 10 } as const;

export interface PlexPage<T> {
  items: T[];
  /** null when the server omits totalSize — caller stops on short page. */
  totalSize: number | null;
}

/**
 * Fetch one page of a library section. Entry schema parses each Directory
 * (types 8/9) or Track (type 10) element; malformed entries throw via Zod.
 */
export async function fetchSectionPage<T>(
  config: PlexServerConfig,
  libraryKey: string,
  type: number,
  start: number,
  size: number,
  entrySchema: z.ZodType<T>,
): Promise<PlexPage<T>> {
  const url = new URL(`/library/sections/${libraryKey}/all`, config.baseUrl);
  url.searchParams.set("type", String(type));
  url.searchParams.set("X-Plex-Container-Start", String(start));
  url.searchParams.set("X-Plex-Container-Size", String(size));

  const response = await plexFetch(config, `${url.pathname}${url.search}`);
  if (!response.ok) {
    throw new PlexApiError(
      `Failed to fetch Plex section page (type ${type}, start ${start}): ${response.status} ${response.statusText}`,
      response.status,
    );
  }

  const containerSchema = z.object({
    MediaContainer: z
      .object({
        size: z.number().optional(),
        totalSize: z.number().optional(),
        offset: z.number().optional(),
        Directory: z.array(entrySchema).optional(),
        Track: z.array(entrySchema).optional(),
      })
      .loose(),
  });

  const data = containerSchema.parse(await response.json());
  const container = data.MediaContainer;
  const items = container.Directory ?? container.Track ?? [];

  return {
    items,
    totalSize: container.totalSize ?? null,
  };
}
