import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MediaArt } from "@/components/media/art";
import { SyncAllButton } from "@/components/sync/sync-all-button";
import { SyncEvents } from "@/components/sync/sync-events";
import { decodePlexId, encodePlexId } from "@/lib/plex-id";
import { db } from "@/lib/server/db";
import { getAlbumsFromArtistWithCounts } from "@/lib/server/db/queries";
import { artists, libraries } from "@/lib/server/db/schema";

import { syncArtist } from "./actions";

// Reads live DB state — must render per request, not at build time.
export const dynamic = "force-dynamic";

interface ArtistPageProps {
  params: Promise<{ uuid: string }>;
}

export default async function ArtistPage({ params }: ArtistPageProps) {
  const { uuid: encodedId } = await params;

  let artistId: string;
  try {
    artistId = decodePlexId(encodedId);
  } catch {
    notFound();
  }

  const artist = await db.query.artists.findFirst({
    where: eq(artists.uuid, artistId),
  });
  if (!artist) {
    notFound();
  }

  const activeLibrary = await db.query.libraries.findFirst({
    where: eq(libraries.active, true),
  });
  if (!activeLibrary) {
    notFound();
  }

  const albums = await getAlbumsFromArtistWithCounts(activeLibrary.uuid, artist.uuid);

  return (
    <div className="space-y-6">
      <SyncEvents uuid={artist.uuid} />
      <nav className="text-sm text-muted">
        <Link href="/library" className="hover:text-foreground">
          Library
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{artist.title}</span>
      </nav>

      <div className="flex items-end gap-5">
        <div className="w-40 shrink-0 overflow-hidden rounded-xl border border-border bg-surface">
          <MediaArt src={artist.image} alt={artist.title} variant="square" />
        </div>
        <div className="flex-1 space-y-1">
          <h1 className="text-3xl font-semibold">{artist.title}</h1>
          <p className="text-sm text-muted">
            {albums.length}
            {" albums"}
          </p>
          {artist.summary && (
            <p className="max-w-2xl text-sm text-muted">{artist.summary}</p>
          )}
        </div>
        <SyncAllButton action={syncArtist.bind(null, artist.uuid)} />
      </div>

      {albums.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-10 text-center">
          <p className="text-sm text-muted">No albums found for this artist.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {albums.map(album => (
            <li key={album.uuid}>
              <Link
                href={`/library/album/${encodePlexId(album.uuid)}`}
                className="group block space-y-2"
              >
                <div className="overflow-hidden rounded-lg border border-border bg-surface transition group-hover:border-accent">
                  <MediaArt src={album.image} alt={album.title} variant="square" />
                </div>
                <div className="space-y-0.5">
                  <p className="truncate text-sm font-medium">{album.title}</p>
                  <p className="text-xs text-muted">
                    {album.syncedTracks}
                    {" / "}
                    {album.trackCount}
                    {" tracks synced"}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
