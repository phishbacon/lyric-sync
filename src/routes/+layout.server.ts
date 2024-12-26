import type { Directory, InferredInsertLibrarySchema, LibrarySectionsResponse, ServerLoadDefaultValues } from "$lib/types";

import { libraries } from "$lib/schema";
import db from "$lib/server/db";
import { eq, sql } from "drizzle-orm";
import { toSnakeCase } from "drizzle-orm/casing";

import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async () => {
  const defaultValues: ServerLoadDefaultValues = {
    serverConfiguration: undefined,
    libraries: [],
    currentLibrary: undefined,
  };
  let databaseLibraries: Array<InferredInsertLibrarySchema> = [];
  let plexLibraries: Array<InferredInsertLibrarySchema> = [];

  // get server configuration
  const serverConfiguration = await db.query.servers.findFirst();

  if (serverConfiguration) {
    defaultValues.serverConfiguration = serverConfiguration;

    // get libraries from database
    const returned = await db.query.libraries.findMany({
      where: eq(libraries.serverName, serverConfiguration.serverName),
    });

    if (returned) {
      // create array of InferredInsertLibrarySchema
      // from the db response so we can merge that with
      // whatever we got from plex
      databaseLibraries = returned.map(({ serverName, path, title, uuid, image, key, currentLibrary }) => {
        return {
          serverName,
          path,
          title,
          uuid,
          image,
          key,
          currentLibrary,
        };
      });
    }

    // Get plex libraries
    const baseURL = `${serverConfiguration?.hostname}:${serverConfiguration?.port}`;
    const plexAuthToken = `?X-Plex-Token=${serverConfiguration?.xPlexToken}`;

    const response = await fetch(`${baseURL}/library/sections${plexAuthToken}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (response.ok) {
      const LibrarySectionsResponse: LibrarySectionsResponse = await response.json();
      const plexDirectories: Array<Directory> = LibrarySectionsResponse.MediaContainer.Directory.filter(e => e.type === "artist" && !e.hidden);

      if (plexDirectories) {
      // TODO: Use zod to validate
        plexLibraries = plexDirectories.map((library) => {
          return {
            serverName: serverConfiguration.serverName,
            path: library.Location[0].path,
            title: library.title,
            uuid: library.uuid,
            image: library.composite,
            key: library.key,
          };
        });
      }
    }

    // if databaseLibraries and plexLibraries are populated then we're good
    if (databaseLibraries && plexLibraries) {
      // if uuid in databaseLibraries doesn't exist in plexLibraries
      // delete it
      databaseLibraries.forEach(async (databaseLibrary) => {
        const doesUUIDExistInPlexLibraries = plexLibraries.find(plexLibrary => plexLibrary.uuid === databaseLibrary.uuid);
        if (!doesUUIDExistInPlexLibraries) {
          await db.delete(libraries).where(eq(libraries.uuid, databaseLibrary.uuid));
        }
      });

      // TODO: only update libraries in the db that actually differ from what plex has
      // instead of upserting everything everytime

      // now we can just upsert the libraries returned from plex
      const updatedLibraries = await db.insert(libraries).values(plexLibraries).onConflictDoUpdate({
        target: libraries.uuid,
        set: {
          serverName: sql.raw(`excluded.${toSnakeCase(libraries.serverName.name)}`),
          path: sql.raw(`excluded.${toSnakeCase(libraries.path.name)}`),
          title: sql.raw(`excluded.${toSnakeCase(libraries.title.name)}`),
        },
      }).returning();

      // might as well take advantage of upserting everything everytime
      if (updatedLibraries) {
        defaultValues.libraries = updatedLibraries;
        defaultValues.currentLibrary = updatedLibraries.find(library => library.currentLibrary);
      }
    }
  }

  return defaultValues;
};
