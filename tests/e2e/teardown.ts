/* eslint-disable node/no-process-env -- cleanup for the test-specific temp directory */
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname } from "node:path";

export default function teardown() {
  const root = process.env.LYRIC_SYNC_E2E_ROOT;
  // Never remove an arbitrary path if the environment was misconfigured.
  if (root && dirname(root) === tmpdir() && basename(root).startsWith("lyric-sync-e2e-")) {
    rmSync(root, { recursive: true, force: true });
  }
}
