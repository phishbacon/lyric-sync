import { redirect } from "next/navigation";

import { db } from "@/lib/server/db";

import { SetupForm } from "./setup-form";

// Reads live DB state — must render per request, not at build time.
export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const existing = await db.query.servers.findFirst();
  if (existing) {
    redirect("/setup/select-library");
  }

  return <SetupForm />;
}
