import type { RequestHandler } from "@sveltejs/kit";
import type { Metadata as Tracks, Root as TracksResponse } from "$lib/plex-api-types/library-sections-key-all-type-10";
import type { Metadata as Artists, Root as ArtistsResposne } from "$lib/plex-api-types/library-sections-key-all-type-8";
import type { Metadata as Albums, Root as AlbumsResponse } from "$lib/plex-api-types/library-sections-key-all-type-9";
import type { InferredInsertAlbumSchema, InferredInsertArtistSchema, InferredInsertTrackSchema, InferredSelectAlbumSchema, InferredSelectArtistSchema, InferredSelectLibrarySchema, InferredSelectServerSchema, InferredSelectTrackSchema } from "$lib/types";

import { logger } from "$lib/logger";
import { albums, artists, libraries, tracks } from "$lib/schema";
import db from "$lib/server/db";
import noPlexAlbums from "$lib/server/db/no-plex-seed/albums";
import noPlexArtists from "$lib/server/db/no-plex-seed/artists";
import noPlexTracks from "$lib/server/db/no-plex-seed/tracks";
import { getAllArtistsAlbumsTracksInLibrary } from "$lib/server/db/query-utils";
import env from "$lib/server/env";
import { eq, sql } from "drizzle-orm";
import { toSnakeCase } from "drizzle-orm/casing";

export const GET: RequestHandler = async () => {
  const serverConfiguration: InferredSelectServerSchema | undefined = await db.query.servers.findFirst();

  if (serverConfiguration) {
    const currentLibrary: InferredSelectLibrarySchema | undefined = await db.query.libraries.findFirst({
      where: eq(libraries.currentLibrary, true),
    });

    let libraryArtists: Array<InferredInsertArtistSchema> = [];
    let plexLibraryArtists: Array<InferredInsertArtistSchema> = [];
    let artistAlbums: Array<InferredInsertAlbumSchema> = [];
    let plexArtistAlbums: Array<InferredInsertAlbumSchema> = [];
    let albumTracks: Array<InferredInsertTrackSchema> = [];
    let plexAlbumTracks: Array<InferredInsertTrackSchema> = [];

    if (currentLibrary) {
      logger.info("Updating db with latest data from plex");

      const { returnedArtists, returnedAlbums, returnedTracks } = await getAllArtistsAlbumsTracksInLibrary(currentLibrary.uuid);

      if (returnedArtists) {
        // create array of InferredInsertLibrarySchema
        // from the db response so we can merge that with
        // whatever we got from plex
        libraryArtists = returnedArtists.map(({ title, uuid, image, key, summary, synced, library }) => {
          return {
            title,
            uuid,
            image,
            key,
            summary,
            synced,
            library,
          };
        });
      }

      if (returnedAlbums) {
        // create array of InferredInsertAlbumSchema
        // from the db response so we can merge that with
        // whatever we got from plex
        artistAlbums = returnedAlbums.map(({ title, uuid, image, key, summary, synced, library, artist }) => {
          return {
            title,
            uuid,
            image,
            key,
            summary,
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
        albumTracks = returnedTracks.map(({ title, uuid, key, path, synced, library, artist, album, duration, trackNumber }) => {
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
            trackNumber,
          };
        });
      }

      if (env.NO_PLEX) {
        plexLibraryArtists = noPlexArtists;
        plexArtistAlbums = noPlexAlbums;
        plexAlbumTracks = noPlexTracks;
      }
      else {
        // get artists from plex
        const baseURL: string = `${serverConfiguration?.hostname}:${serverConfiguration?.port}`;
        const plexAuthToken: string = `X-Plex-Token=${serverConfiguration?.xPlexToken}`;
        const artistsResponse: Response = await fetch(`${baseURL}/library/sections/${currentLibrary?.key}/all?type=8&${plexAuthToken}`, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });

        if (artistsResponse.ok) {
          const artistsJSON: ArtistsResposne = await artistsResponse.json();
          const plexArtists: Array<Artists> = artistsJSON.MediaContainer.Metadata;

          // TODO: Use zod to validate
          plexLibraryArtists = plexArtists.map((artist) => {
            return {
              title: artist.title,
              uuid: artist.guid,
              image: (artist.thumb ? artist.thumb : artist.art) ?? "replace-with-default-asset",
              key: artist.key,
              summary: artist.summary,
              library: artistsJSON.MediaContainer.librarySectionUUID,
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

        // now we get every album from plex
        const albumsResponse: Response = await fetch(`${baseURL}/library/sections/${currentLibrary?.key}/all?type=9&${plexAuthToken}`, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });

        if (albumsResponse.ok) {
          const albumsJSON: AlbumsResponse = await albumsResponse.json();
          const plexAlbums: Array<Albums> = albumsJSON.MediaContainer.Metadata;

          // TODO: Use zod to validate
          plexArtistAlbums = plexAlbums.map((album) => {
            return {
              title: album.title,
              uuid: album.guid,
              image: album.thumb ? album.thumb : album.art,
              key: album.key,
              summary: album.summary,
              library: albumsJSON.MediaContainer.librarySectionUUID,
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
        }

        // now we get every track from plex
        const tracksResponse: Response = await fetch(`${baseURL}/library/sections/${currentLibrary?.key}/all?type=10&${plexAuthToken}`, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });

        if (tracksResponse.ok) {
          const tracksJSON: TracksResponse = await tracksResponse.json();
          const plexTracks: Array<Tracks> = tracksJSON.MediaContainer.Metadata;

          // TODO: Use zod to validate
          plexAlbumTracks = plexTracks.map((track) => {
            return {
              title: track.title,
              uuid: track.guid,
              key: track.key,
              path: track.Media[0].Part[0].file,
              library: tracksJSON.MediaContainer.librarySectionUUID,
              artist: track.grandparentGuid,
              album: track.parentGuid,
              duration: track.Media[0].Part[0].duration,
              trackNumber: track.index,
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
        }
      }

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
          summary: sql.raw(`excluded.${toSnakeCase(artists.summary.name)}`),
        },
      }).returning();

      logger.info(`Artists updated for library: ${currentLibrary.uuid}`);
      logger.debug(updatedArtists);

      // now we can just upsert the albums returned from plex
      const updatedAlbums: Array<InferredSelectAlbumSchema> = await db.insert(albums).values(plexArtistAlbums).onConflictDoUpdate({
        target: albums.uuid,
        set: {
          title: sql.raw(`excluded.${toSnakeCase(albums.title.name)}`),
          image: sql.raw(`excluded.${toSnakeCase(albums.image.name)}`),
          key: sql.raw(`excluded.${toSnakeCase(albums.key.name)}`),
          library: sql.raw(`excluded.${toSnakeCase(albums.library.name)}`),
          artist: sql.raw(`excluded.${toSnakeCase(albums.artist.name)}`),
          summary: sql.raw(`excluded.${toSnakeCase(albums.summary.name)}`),
        },
      }).returning();

      logger.info(`Albust updated for library: ${currentLibrary.uuid}`);
      logger.debug(updatedAlbums);
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
          trackNumber: sql.raw(`excluded.${toSnakeCase(tracks.trackNumber.name)}`),
        },
      }).returning();

      logger.info(`Tracks updated for library: ${currentLibrary.uuid}`);
      logger.debug(updatedTracks);
    };
  }

  return new Response(JSON.stringify("hi"));
};
