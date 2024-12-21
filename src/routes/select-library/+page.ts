import type { Directory, LibrarySectionsResponse } from "$lib/types";

import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ parent }) => {
  const configuration = await parent();
  const serverConfiguration = configuration.serverConfiguration;
  const baseURL = `${serverConfiguration?.hostname}:${serverConfiguration?.port}`;
  const plexAuthToken = `?X-Plex-Token=${serverConfiguration?.xPlexToken}`;

  const response = await fetch(`${baseURL}/library/sections${plexAuthToken}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  const LibrarySectionsResponse: LibrarySectionsResponse = await response.json();
  const musicLibraries: Array<Directory> = LibrarySectionsResponse.MediaContainer.Directory.filter(e => e.type === "artist");
  return {
    musicLibraries,
  };
};
