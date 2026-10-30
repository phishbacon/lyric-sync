import { stat } from "node:fs/promises";

async function fileExists(path: string): Promise<boolean> {
  try {
    const info = await stat(path);
    return info.isFile();
  } catch {
    return false;
  }
}

/** Strip the final extension: "/a/b/song.mp3" -> "/a/b/song". */
function stripExtension(trackPath: string): string {
  const dot = trackPath.lastIndexOf(".");
  const slash = trackPath.lastIndexOf("/");
  return dot > slash ? trackPath.slice(0, dot) : trackPath;
}

/**
 * Disk-first reconciliation: does a lyric file already sit next to the
 * track's audio file? Checks `.lrc` (preferred) then `.txt`.
 * Returns the existing file's path or null.
 */
export async function findExistingLyricFile(
  trackPath: string | null,
): Promise<string | null> {
  if (trackPath === null || trackPath === "") {
    return null;
  }

  const stem = stripExtension(trackPath);

  const lrcPath = `${stem}.lrc`;
  if (await fileExists(lrcPath)) {
    return lrcPath;
  }

  const txtPath = `${stem}.txt`;
  if (await fileExists(txtPath)) {
    return txtPath;
  }

  return null;
}
