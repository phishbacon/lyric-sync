import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/lib/server/db";
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

  // Artists grid arrives in milestone (b) along with Plex ingestion.
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{activeLibrary.title}</h1>
      <p className="text-sm text-muted">
        Library ingested. Artist browsing arrives in the next milestone.
      </p>
    </div>
  );
}
