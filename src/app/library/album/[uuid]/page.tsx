import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MediaArt } from "@/components/media/art";
import { SyncStatusBadge } from "@/components/media/track-status";
import { SyncAllButton } from "@/components/sync/sync-all-button";
import { SyncEvents } from "@/components/sync/sync-events";
import { TrackSyncButton } from "@/components/sync/track-sync-button";
import { formatDuration } from "@/lib/format-duration";
import { decodePlexId, encodePlexId } from "@/lib/plex-id";
import { db } from "@/lib/server/db";
import { getTracksFromAlbum } from "@/lib/server/db/queries";
import { albums, artists, libraries } from "@/lib/server/db/schema";

import { syncAlbum, syncSingleTrack } from "./actions";

// Reads live DB state — must render per request, not at build time.
export const dynamic = "force-dynamic";

interface AlbumPageProps {
  params: Promise<{ uuid: string }>;
}

export default async function AlbumPage({ params }: AlbumPageProps) {
  const { uuid: encodedId } = await params;

  let albumId: string;
  try {
    albumId = decodePlexId(encodedId);
  } catch {
    notFound();
  }

  const album = await db.query.albums.findFirst({
    where: eq(albums.uuid, albumId),
  });
  if (!album) {
    notFound();
  }

  const artist = await db.query.artists.findFirst({
    where: eq(artists.uuid, album.artistUuid),
  });

  const activeLibrary = await db.query.libraries.findFirst({
    where: eq(libraries.active, true),
  });
  if (!activeLibrary) {
    notFound();
  }

  const tracks = await getTracksFromAlbum(activeLibrary.uuid, album.uuid);

  return (
    <div className="space-y-6">
      <SyncEvents uuid={album.uuid} />
      <nav className="text-sm text-muted">
        <Link href="/library" className="hover:text-foreground">
          Library
        </Link>
        <span className="mx-2">/</span>
        {artist && (
          <>
            <Link
              href={`/library/artist/${encodePlexId(artist.uuid)}`}
              className="hover:text-foreground"
            >
              {artist.title}
            </Link>
            <span className="mx-2">/</span>
          </>
        )}
        <span className="text-foreground">{album.title}</span>
      </nav>

      <div className="flex items-end gap-5">
        <div className="w-40 shrink-0 overflow-hidden rounded-xl border border-border bg-surface">
          <MediaArt src={album.image} alt={album.title} variant="square" />
        </div>
        <div className="flex-1 space-y-1">
          <h1 className="text-3xl font-semibold">{album.title}</h1>
          {artist && <p className="text-sm text-muted">{artist.title}</p>}
          <p className="text-sm text-muted">
            {tracks.length}
            {" tracks"}
          </p>
        </div>
        <SyncAllButton action={syncAlbum.bind(null, album.uuid)} />
      </div>

      {tracks.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-10 text-center">
          <p className="text-sm text-muted">No tracks found for this album.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="w-12 px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="w-20 px-4 py-3 text-right font-medium">Length</th>
                <th className="w-56 px-4 py-3 text-right font-medium">Lyrics</th>
              </tr>
            </thead>
            <tbody>
              {tracks.map(track => (
                <tr key={track.key} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-muted">{track.trackNumber}</td>
                  <td className="px-4 py-3">{track.title}</td>
                  <td className="px-4 py-3 text-right text-muted">
                    {formatDuration(track.duration)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center justify-end gap-3">
                      <SyncStatusBadge status={track.syncStatus} />
                      <TrackSyncButton
                        action={syncSingleTrack.bind(null, track.key)}
                      />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
