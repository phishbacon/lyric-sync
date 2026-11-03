import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/lib/server/db";
import { libraries } from "@/lib/server/db/schema";
import { defaultLrcmuxSettings, getLrcmuxSettings, LRCMUX_SOURCES } from "@/lib/server/settings/lrcmux";

import { startPlexAuth, updateServerToken } from "../setup/actions";
import { LrcmuxSettingsForm } from "./lrcmux-settings-form";
import { SettingsForm } from "./settings-form";

// Reads live DB state — must render per request, not at build time.
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const server = await db.query.servers.findFirst();
  if (!server) {
    redirect("/setup");
  }

  const [active, lrcmux] = await Promise.all([
    db.query.libraries.findFirst({ where: eq(libraries.active, true) }),
    getLrcmuxSettings(),
  ]);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted">
          Plex connection, library import, and lyric sources.
        </p>
      </div>

      <SettingsForm
        server={{
          name: server.name,
          baseUrl: server.baseUrl,
        }}
        activeLibrary={
          active === undefined ? null : { title: active.title, path: active.path }
        }
        startAuth={startPlexAuth}
        updateToken={updateServerToken}
      />
      <LrcmuxSettingsForm
        initial={lrcmux}
        defaults={defaultLrcmuxSettings()}
        sources={LRCMUX_SOURCES.map(source => ({ ...source }))}
      />
    </div>
  );
}
