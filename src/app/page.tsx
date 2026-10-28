import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/server/db";
import { libraries } from "@/lib/server/db/schema";

// Reads live DB state — must render per request, not at build time.
export const dynamic = "force-dynamic";

export default async function Home() {
  const server = await db.query.servers.findFirst();
  if (!server) {
    redirect("/setup");
  }

  const activeLibrary = await db.query.libraries.findFirst({
    where: eq(libraries.active, true),
  });
  if (!activeLibrary) {
    redirect("/setup/select-library");
  }

  redirect("/library");
}
