import type { Metadata as AlbumMetadata, Root as AlbumRoot } from "$lib/plex-api-types/library-metadata-key-children-album";
import type { Metadata as ArtistMetadata, Root as ArtistRoot } from "$lib/plex-api-types/library-metadata-key-children-artist";
import type { Metadata, Root } from "$lib/plex-api-types/library-sections-key-all";
import type { InferredInsertAlbumSchema, InferredInsertArtistSchema, InferredSelectAlbumSchema, InferredSelectArtistSchema, ServerLoadDefaultValues } from "$lib/types";

import { albums, artists } from "$lib/schema";
import db from "$lib/server/db";
import { eq, sql } from "drizzle-orm";
import { toSnakeCase } from "drizzle-orm/casing";

import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ parent }) => {
  let libraryArtists: Array<InferredInsertArtistSchema> = [];
  let plexLibraryArtists: Array<InferredInsertArtistSchema> = [];
  let artistAlbums: Array<InferredInsertAlbumSchema> = [];
  let plexArtistAlbums: Array<InferredInsertAlbumSchema> = [];

  const { serverConfiguration, currentLibrary }: ServerLoadDefaultValues = await parent();
  // Get artists of current library from database

  // get artists from database
  if (currentLibrary) {
    const returnedArtists: Array<InferredSelectArtistSchema> | undefined = await db.query.artists.findMany({
      where: eq(artists.library, currentLibrary?.uuid),
    });

    const returnedAlbums: Array<InferredSelectAlbumSchema> | undefined = await db.query.albums.findMany({
      where: eq(albums.library, currentLibrary?.uuid),
    });

    if (returnedArtists) {
      // create array of InferredInsertLibrarySchema
      // from the db response so we can merge that with
      // whatever we got from plex
      libraryArtists = returnedArtists.map(({ title, uuid, image, key, synced, library }) => {
        return {
          title,
          uuid,
          image,
          key,
          synced,
          library,
        };
      });

      if (returnedAlbums) {
      // create array of InferredInsertAlbumSchema
      // from the db response so we can merge that with
      // whatever we got from plex
        artistAlbums = returnedAlbums.map(({ title, uuid, image, key, synced, library, artist }) => {
          return {
            title,
            uuid,
            image,
            key,
            synced,
            library,
            artist,
          };
        });
      }
    }

    // get artists from plex
    const baseURL: string = `${serverConfiguration?.hostname}:${serverConfiguration?.port}`;
    const plexAuthToken: string = `?X-Plex-Token=${serverConfiguration?.xPlexToken}`;
    const artistsResponse: Response = await fetch(`${baseURL}/library/sections/${currentLibrary?.key}/all${plexAuthToken}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (artistsResponse.ok) {
      const LibrarySectionsKeyAllResponse: Root = await artistsResponse.json();
      const plexArtists: Array<Metadata> = LibrarySectionsKeyAllResponse.MediaContainer.Metadata;

      // TODO: Use zod to validate
      plexLibraryArtists = plexArtists.map((artist) => {
        return {
          title: artist.title,
          uuid: artist.guid,
          image: artist.art ? artist.art : artist.thumb,
          key: artist.key,
          library: LibrarySectionsKeyAllResponse.MediaContainer.librarySectionUUID,
        };
      });

      // if uuid in libaryArtists doesn't exist in plexLibraryArtists
      // delete it
      await Promise.all(libraryArtists.map((libraryArtist) => {
        const doesUUIDExistInPlexLibraryArtists: InferredInsertArtistSchema | undefined = plexLibraryArtists.find(plexLibraryArtist => plexLibraryArtist.uuid === libraryArtist.uuid);
        if (doesUUIDExistInPlexLibraryArtists) {
          return null;
        }
        else {
          return db.delete(artists).where(eq(artists.uuid, libraryArtist.uuid));
        }
      }));

      // now we get every album relating to each artists from plex
      const albumsResponse: Array<Response> = await Promise.all(plexLibraryArtists.map((artist) => {
        return fetch(`${baseURL}${artist.key}${plexAuthToken}`, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });
      }));

      // here we get the children of each artist which contains an Array of Metadata, each element being an album
      const artistAlbumsRoot: Array<ArtistRoot> = await Promise.all(albumsResponse.reduce((acc: Array<ArtistRoot>, response: Response) => {
        if (response.ok) {
          acc.push(response.json() as unknown as ArtistRoot); // this is stupid
        }
        return acc;
      }, []));

      const plexAlbums: Array<ArtistMetadata> = artistAlbumsRoot.flatMap(root => root.MediaContainer.Metadata);

      // TODO: Use zod to validate
      plexArtistAlbums = plexAlbums.map((album) => {
        return {
          title: album.title,
          uuid: album.guid,
          image: album.art ? album.art : album.thumb,
          key: album.key,
          library: LibrarySectionsKeyAllResponse.MediaContainer.librarySectionUUID,
          artist: album.parentGuid,
        };
      });

      // if uuid in artistAlbums doesn't exist in plexArtistsAlbums
      // delete it
      await Promise.all(artistAlbums.map((artistAlbum) => {
        const doesUUIDExistInPlexArtistAlbums: InferredInsertAlbumSchema | undefined = plexArtistAlbums.find(plexArtistAlbum => plexArtistAlbum.uuid === artistAlbum.uuid);
        if (doesUUIDExistInPlexArtistAlbums) {
          return null;
        }
        else {
          return db.delete(albums).where(eq(albums.uuid, artistAlbum.uuid));
        }
      }));
      // TODO: only update artists/albums in the db that actually differ from what plex has
      // instead of upserting everything everytime

      // now we can just upsert the artists returned from plex
      const _updatedArtists: Array<InferredSelectArtistSchema> = await db.insert(artists).values(plexLibraryArtists).onConflictDoUpdate({
        target: artists.uuid,
        set: {
          title: sql.raw(`excluded.${toSnakeCase(artists.title.name)}`),
          image: sql.raw(`excluded.${toSnakeCase(artists.image.name)}`),
          key: sql.raw(`excluded.${toSnakeCase(artists.key.name)}`),
          library: sql.raw(`excluded.${toSnakeCase(artists.library.name)}`),
        },
      }).returning();

      // now we can just upsert the albums returned from plex
      const _updatedAlbums: Array<InferredSelectAlbumSchema> = await db.insert(albums).values(plexArtistAlbums).onConflictDoUpdate({
        target: albums.uuid,
        set: {
          title: sql.raw(`excluded.${toSnakeCase(albums.title.name)}`),
          image: sql.raw(`excluded.${toSnakeCase(albums.image.name)}`),
          key: sql.raw(`excluded.${toSnakeCase(albums.key.name)}`),
          library: sql.raw(`excluded.${toSnakeCase(albums.library.name)}`),
          artist: sql.raw(`excluded.${toSnakeCase(albums.artist.name)}`),
        },
      }).returning();
      console.log(_updatedArtists);
    }
  };
};
