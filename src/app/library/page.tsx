import { eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LibraryHeading } from "@/components/library/library-heading";
import { LibrarySyncAll } from "@/components/library/library-sync-all";
import { MediaArt } from "@/components/media/art";
import { SyncEvents } from "@/components/sync/sync-events";
import { encodePlexId } from "@/lib/plex-id";
import { db } from "@/lib/server/db";
import { getArtistsWithCounts } from "@/lib/server/db/queries";
import { libraries } from "@/lib/server/db/schema";

// Reads live DB state — must render per request, not at build time.
export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const activeLibrary = await db.query.libraries.findFirst({
    where: eq(libraries.active, true),
  });
  if (!activeLibrary) {
    redirect("/setup/select-library");
  }

  const artists = await getArtistsWithCounts(activeLibrary.uuid);

  return (
    <div className="space-y-6">
      <SyncEvents />
      <LibraryHeading title={activeLibrary.title} count={artists.length} noun="artists" />
      <div className="flex justify-end"><LibrarySyncAll kind="artists" /></div>

      {artists.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-10 text-center">
          <p className="text-sm text-muted">
            No artists yet. Library ingestion is still running — this page
            fills in as it completes.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {artists.map(artist => (
            <li key={artist.uuid}>
              <Link
                href={`/library/artist/${encodePlexId(artist.uuid)}`}
                className="group block space-y-2"
              >
                <div className="overflow-hidden rounded-lg border border-border bg-surface transition group-hover:border-accent">
                  <MediaArt src={artist.image} alt={artist.title} variant="square" />
                </div>
                <div className="space-y-0.5">
                  <p className="truncate text-sm font-medium">{artist.title}</p>
                  <p className="text-xs text-muted">
                    {artist.syncedTracks}
                    {" / "}
                    {artist.trackCount}
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
