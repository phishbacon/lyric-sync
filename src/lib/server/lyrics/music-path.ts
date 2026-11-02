import { isAbsolute, join, relative, resolve, sep } from "node:path";

import { env } from "@/lib/server/env";

type MusicMirror = { sourceRoot?: string; mirrorRoot?: string };

/**
 * Translate a Plex audio path into its isolated mirror for lyric I/O.
 * When a mirror is configured, paths outside the source root are rejected;
 * they must never fall back to the host's actual music directory.
 */
export function resolveLyricPath(
  plexPath: string,
  mirror: MusicMirror = {
    sourceRoot: env.LYRIC_SYNC_MUSIC_SOURCE_ROOT,
    mirrorRoot: env.LYRIC_SYNC_MUSIC_MIRROR_ROOT,
  },
): string {
  if (!mirror.sourceRoot && !mirror.mirrorRoot) {
    return plexPath;
  }
  if (!mirror.sourceRoot || !mirror.mirrorRoot || !isAbsolute(mirror.sourceRoot)
    || !isAbsolute(mirror.mirrorRoot) || !isAbsolute(plexPath)) {
    throw new Error(`Cannot map lyric path: invalid music mirror configuration or path: ${plexPath}`);
  }

  const suffix = relative(resolve(mirror.sourceRoot), resolve(plexPath));
  if (suffix === ".." || suffix.startsWith(`..${sep}`) || isAbsolute(suffix)) {
    throw new Error(`Refusing lyric access outside configured music root: ${plexPath}`);
  }
  return join(mirror.mirrorRoot, suffix);
}
