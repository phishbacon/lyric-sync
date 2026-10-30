import { db } from "@/lib/server/db";

/**
 * Resolve a Plex-relative artwork path (e.g. `/library/metadata/123/thumb`)
 * to an absolute URL on the configured server.
 *
 * Plex reports artwork as root-relative paths because it expects the client
 * to already know its address. We store them verbatim at ingestion, so the
 * address has to be applied at read time — from the same server row the rest
 * of the app uses, never from a second source of truth.
 */
export async function resolvePlexArt(path: string | null): Promise<string | null> {
  if (!path) {
    return null;
  }
  // Already absolute (some Plex versions return full URLs).
  if (/^https?:\/\//.test(path)) {
    return path;
  }

  const server = await db.query.servers.findFirst();
  if (!server?.baseUrl) {
    return null;
  }

  try {
    const base = new URL(server.baseUrl);
    const resolved = new URL(path, base);
    // Only proxy same-origin art; anything else would be an open redirect.
    return resolved.origin === base.origin ? resolved.toString() : null;
  } catch {
    return null;
  }
}

/** Batch variant for list views — one server lookup, not one per tile. */
export async function resolvePlexArtMany(paths: Array<string | null>): Promise<Map<string, string>> {
  const resolved = new Map<string, string>();
  const server = await db.query.servers.findFirst();
  if (!server?.baseUrl) {
    return resolved;
  }

  let base: URL;
  try {
    base = new URL(server.baseUrl);
  } catch {
    return resolved;
  }

  for (const path of paths) {
    if (!path || resolved.has(path)) {
      continue;
    }
    try {
      const url = new URL(path, base);
      if (url.origin === base.origin) {
        resolved.set(path, url.toString());
      }
    } catch {
      // Malformed path — leave unmapped so the tile falls back to placeholder.
    }
  }
  return resolved;
}
