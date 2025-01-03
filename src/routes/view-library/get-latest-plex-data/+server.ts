import type { RequestHandler } from "@sveltejs/kit";
import type { Metadata as AlbumMetadata, Root as AlbumRoot } from "$lib/plex-api-types/library-metadata-key-children-album";
import type { Metadata as ArtistMetadata, Root as ArtistRoot } from "$lib/plex-api-types/library-metadata-key-children-artist";
import type { Metadata, Root } from "$lib/plex-api-types/library-sections-key-all";
import type { InferredInsertAlbumSchema, InferredInsertArtistSchema, InferredInsertTrackSchema, InferredSelectAlbumSchema, InferredSelectArtistSchema, InferredSelectLibrarySchema, InferredSelectServerSchema, InferredSelectTrackSchema, ServerLoadDefaultValues, TestConnectionResponse } from "$lib/types";

import { logger } from "$lib/logger";
import { albums, artists, libraries, servers, tracks } from "$lib/schema";
import db from "$lib/server/db";
import { getAristsAlbumsTracksForLibrary } from "$lib/server/db/query-utils";
import { eq, sql } from "drizzle-orm";
import { toSnakeCase } from "drizzle-orm/casing";

export const POST: RequestHandler = async () => {
  const serverConfiguration: InferredSelectServerSchema | undefined = await db.query.servers.findFirst();

  if (serverConfiguration) {
    const currentLibrary: InferredSelectLibrarySchema | undefined = await db.query.libraries.findFirst({
      where: eq(libraries.currentLibrary, true),
    });

    let librarySectionUUID: string;
    let libraryArtists: Array<InferredInsertArtistSchema> = [];
    let plexLibraryArtists: Array<InferredInsertArtistSchema> = [];
    let artistAlbums: Array<InferredInsertAlbumSchema> = [];
    let plexArtistAlbums: Array<InferredInsertAlbumSchema> = [];
    let albumTracks: Array<InferredInsertTrackSchema> = [];
    let plexAlbumTracks: Array<InferredInsertTrackSchema> = [];

    if (currentLibrary) {
      logger.info("Updating db with latest data from plex");

      const { returnedArtists, returnedAlbums, returnedTracks } = await getAristsAlbumsTracksForLibrary(currentLibrary);

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
      }

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

      if (returnedTracks) {
      // create array of InferredInsertTrackSchema
      // from the db response so we can merge that with
      // whatever we got from plex
        albumTracks = returnedTracks.map(({ title, uuid, key, path, synced, library, artist, album, duration }) => {
          return {
            title,
            uuid,
            key,
            path,
            synced,
            library,
            artist,
            album,
            duration,
          };
        });
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
        librarySectionUUID = LibrarySectionsKeyAllResponse.MediaContainer.librarySectionUUID;

        // TODO: Use zod to validate
        plexLibraryArtists = plexArtists.map((artist) => {
          return {
            title: artist.title,
            uuid: artist.guid,
            image: (artist.art ? artist.art : artist.thumb) ?? "replace-with-default-asset",
            key: artist.key,
            library: librarySectionUUID,
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
      }

      // now we get every album relating to each artists from plex
      const albumsResponse: Array<PromiseSettledResult<Response>> = await Promise.allSettled(plexLibraryArtists.map((artist) => {
        return fetch(`${baseURL}${artist.key}${plexAuthToken}`, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });
      }));

      // here we get the children of each artist which contains an Array of Metadata, each element being an album
      const artistAlbumsRoot: Array<PromiseSettledResult<ArtistRoot>> = await Promise.allSettled(albumsResponse.reduce((acc: Array<ArtistRoot>, response: PromiseSettledResult<Response>) => {
        if (response.status === "fulfilled" && response.value.ok) {
          acc.push(response.value.json() as unknown as ArtistRoot); // this is stupid
        }
        return acc;
      }, []));

      const plexAlbums: Array<ArtistMetadata> = artistAlbumsRoot.reduce((acc: Array<Array<ArtistMetadata>>, albums) => {
        if (albums.status === "fulfilled") {
          acc.push(albums.value.MediaContainer.Metadata);
        }
        return acc;
      }, []).flat();

      // TODO: Use zod to validate
      plexArtistAlbums = plexAlbums.map((album) => {
        return {
          title: album.title,
          uuid: album.guid,
          image: album.art ? album.art : album.thumb,
          key: album.key,
          library: librarySectionUUID,
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

      // now we get every track relating to each album from plex
      const tracksResponse: Array<PromiseSettledResult<Response>> = await Promise.allSettled(plexArtistAlbums.map((album) => {
        return fetch(`${baseURL}${album.key}${plexAuthToken}`, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });
      }));

      // here we get the children of each album which contains an Array of Metadata, each element being a track
      const albumTracksRoot: Array<PromiseSettledResult<AlbumRoot>> = await Promise.allSettled(tracksResponse.reduce((acc: Array<AlbumRoot>, response: PromiseSettledResult<Response>) => {
        if (response.status === "fulfilled" && response.value.ok) {
          acc.push(response.value.json() as unknown as AlbumRoot); // this is stupid
        }
        return acc;
      }, []));

      const plexTracks: Array<AlbumMetadata> = albumTracksRoot.reduce((acc: Array<Array<AlbumMetadata>>, tracks) => {
        if (tracks.status === "fulfilled") {
          acc.push(tracks.value.MediaContainer.Metadata);
        }
        return acc;
      }, []).flat();

      // TODO: Use zod to validate
      plexAlbumTracks = plexTracks.map((track) => {
        return {
          title: track.title,
          uuid: track.guid,
          key: track.key,
          path: track.Media[0].Part[0].file,
          library: librarySectionUUID,
          artist: track.grandparentGuid,
          album: track.parentGuid,
          duration: track.Media[0].Part[0].duration,
        };
      });

      // if uuid in albumTracks doesn't exist in plexAlbumTracks
      // delete it
      await Promise.all(albumTracks.map((albumTrack) => {
        const doesUUIDExistInPlexAlbumTracks: InferredInsertTrackSchema | undefined = plexAlbumTracks.find(plexAlbumTrack => plexAlbumTrack.uuid === albumTrack.uuid);
        if (doesUUIDExistInPlexAlbumTracks) {
          return null;
        }
        else {
          return db.delete(tracks).where(eq(tracks.uuid, albumTrack.uuid));
        }
      }));
      // TODO: only update artists/albums in the db that actually differ from what plex has
      // instead of upserting everything everytime

      // now we can just upsert the artists returned from plex
      const updatedArtists: Array<InferredSelectArtistSchema> = await db.insert(artists).values(plexLibraryArtists).onConflictDoUpdate({
        target: artists.uuid,
        set: {
          title: sql.raw(`excluded.${toSnakeCase(artists.title.name)}`),
          image: sql.raw(`excluded.${toSnakeCase(artists.image.name)}`),
          key: sql.raw(`excluded.${toSnakeCase(artists.key.name)}`),
          library: sql.raw(`excluded.${toSnakeCase(artists.library.name)}`),
        },
      }).returning();

      logger.info(updatedArtists, "updated artists");

      // now we can just upsert the albums returned from plex
      const updatedAlbums: Array<InferredSelectAlbumSchema> = await db.insert(albums).values(plexArtistAlbums).onConflictDoUpdate({
        target: albums.uuid,
        set: {
          title: sql.raw(`excluded.${toSnakeCase(albums.title.name)}`),
          image: sql.raw(`excluded.${toSnakeCase(albums.image.name)}`),
          key: sql.raw(`excluded.${toSnakeCase(albums.key.name)}`),
          library: sql.raw(`excluded.${toSnakeCase(albums.library.name)}`),
          artist: sql.raw(`excluded.${toSnakeCase(albums.artist.name)}`),
        },
      }).returning();

      logger.info(updatedAlbums, "updated albums");
      // now we can just upsert the tracks returned from plex
      const updatedTracks: Array<InferredSelectTrackSchema> = await db.insert(tracks).values(plexAlbumTracks).onConflictDoUpdate({
        target: tracks.uuid,
        set: {
          title: sql.raw(`excluded.${toSnakeCase(tracks.title.name)}`),
          key: sql.raw(`excluded.${toSnakeCase(tracks.key.name)}`),
          path: sql.raw(`excluded.${toSnakeCase(tracks.path.name)}`),
          library: sql.raw(`excluded.${toSnakeCase(tracks.library.name)}`),
          artist: sql.raw(`excluded.${toSnakeCase(tracks.artist.name)}`),
          album: sql.raw(`excluded.${toSnakeCase(tracks.album.name)}`),
          duration: sql.raw(`excluded.${toSnakeCase(tracks.duration.name)}`),
        },
      }).returning();

      logger.info(updatedTracks, "updated tracks");
    };
  }

  return new Response(JSON.stringify("hi"));
};
