import type { Directory, Root } from "$lib/plex-api-types/library-sections";
import type { InferredInsertLibrarySchema, InferredSelectLibrarySchema, InferredSelectServerSchema, ServerLoadValues } from "$lib/types";

import { libraries, librarySettings } from "$lib/schema";
import db from "$lib/server/db";
import noPlexLibraries from "$lib/server/db/no-plex-seed/libraries";
import { eq } from "drizzle-orm";
import { env } from "node:process";

import type { LayoutServerLoad } from "./$types";

async function getDatabaseLibrariesAndSettings(serverConfiguration: InferredSelectServerSchema): Promise<[Array<InferredSelectLibrarySchema>, Array<InferredInsertLibrarySchema>]> {
  let databaseLibraries: Array<InferredInsertLibrarySchema> = [];
  // get libraries from database
  const returnedDatabases = await db.query.libraries.findMany({
    where: eq(libraries.serverName, serverConfiguration.serverName),
  });

  if (returnedDatabases) {
    // create array of InferredInsertLibrarySchema
    // from the db response so we can merge that with
    // whatever we got from plex
    databaseLibraries = returnedDatabases.map(({ serverName, path, title, uuid, image, key, currentLibrary }) => {
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

  return [returnedDatabases, databaseLibraries];
}

export const load: LayoutServerLoad = async () => {
  const defaultValues: ServerLoadValues = {
    serverConfiguration: undefined,
    libraries: [],
    currentLibrary: undefined,
  };
  let databaseLibraries: [Array<InferredSelectLibrarySchema>, Array<InferredInsertLibrarySchema>];
  let plexLibraries: Array<InferredInsertLibrarySchema> = [];

  // get server configuration
  const serverConfiguration: InferredSelectServerSchema | undefined = await db.query.servers.findFirst();

  if (serverConfiguration) {
    defaultValues.serverConfiguration = serverConfiguration;

    databaseLibraries = await getDatabaseLibrariesAndSettings(serverConfiguration);

    if (env.NO_PLEX) {
      plexLibraries = noPlexLibraries;
    }
    else {
      // Get plex libraries
      const baseURL: string = `${serverConfiguration?.hostname}:${serverConfiguration?.port}`;
      const plexAuthToken: string = `?X-Plex-Token=${serverConfiguration?.xPlexToken}`;
      const response: Response = await fetch(`${baseURL}/library/sections${plexAuthToken}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (response.ok) {
        const LibrarySectionsResponse: Root = await response.json();
        const plexDirectories: Array<Directory> = LibrarySectionsResponse.MediaContainer.Directory.filter(e => e.type === "artist" && !e.hidden);

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

    // if uuid in plexLibraries exists in databaseLibraries
    //  if they differ
    //    update what we have in our db with what plex has
    //  else
    //    do nothing
    // else
    //  insert new library into our db along with new settings record
    await Promise.all(plexLibraries.map((plexLibrary) => {
      const databaseLibrary: InferredInsertLibrarySchema | undefined = databaseLibraries[1].find(e => e.uuid === plexLibrary.uuid);
      if (databaseLibrary) {
        // build updated library object to insert into db
        let syncedLibrary: Partial<InferredInsertLibrarySchema> = {
          serverName: plexLibrary.serverName !== databaseLibrary.serverName ? plexLibrary.serverName : undefined,
          path: plexLibrary.path !== databaseLibrary.path ? plexLibrary.path : undefined,
          title: plexLibrary.title !== databaseLibrary.title ? plexLibrary.title : undefined,
          image: plexLibrary.image !== databaseLibrary.image ? plexLibrary.title : undefined,
        };

        // stringify it then parse it to get rid of the properties with undefined values
        syncedLibrary = JSON.parse(JSON.stringify(syncedLibrary));

        if (Object.keys(syncedLibrary).length > 0) {
          // do the update
          return db.update(libraries).set(syncedLibrary).where(eq(libraries.uuid, plexLibrary.uuid)).returning();
        }
        else {
          return null;
        }
      }
      else {
        return db.insert(libraries).values(plexLibrary).then(() => {
          return db.insert(librarySettings).values({
            library: plexLibrary.uuid,
          });
        });
      }
    }));

    // if uuid in databaseLibraries not in plexLibraries
    //  delete it and its settings record
    await Promise.all(databaseLibraries[1].map((databaseLibrary) => {
      const plexLibrary: InferredInsertLibrarySchema | undefined = plexLibraries.find(e => e.uuid === databaseLibrary.uuid);
      if (plexLibrary) {
        return null;
      }
      else {
        return db.delete(libraries).where(eq(libraries.uuid, databaseLibrary.uuid));
      }
    }));

    const updatedLibraries = await getDatabaseLibrariesAndSettings(serverConfiguration);
    defaultValues.libraries = updatedLibraries[0];
    defaultValues.currentLibrary = updatedLibraries[0].find(library => library.currentLibrary);
  }

  return defaultValues;
};
