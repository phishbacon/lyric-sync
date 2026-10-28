import { redirect } from "next/navigation";
import { db } from "@/lib/server/db";
import { LibraryPicker } from "./library-picker";

// Reads live DB state — must render per request, not at build time.
export const dynamic = "force-dynamic";

export default async function SelectLibraryPage() {
  const server = await db.query.servers.findFirst();
  if (!server) {
    redirect("/setup");
  }

  return <LibraryPicker />;
}
