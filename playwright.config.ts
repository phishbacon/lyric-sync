/* eslint-disable node/no-process-env -- isolated Playwright process configuration */
import { defineConfig, devices } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";

// Playwright evaluates this config in multiple processes. Workers must inherit
// the same root as the web servers, rather than creating their own database.
const testRoot = process.env.LYRIC_SYNC_E2E_ROOT ?? mkdtempSync(join(tmpdir(), "lyric-sync-e2e-"));
if (dirname(testRoot) !== tmpdir() || !basename(testRoot).startsWith("lyric-sync-e2e-")) {
  throw new Error("E2E test directory must be a lyric-sync-e2e-* folder directly in the OS temp directory");
}
process.env.LYRIC_SYNC_E2E_ROOT = testRoot;

const appUrl = "http://127.0.0.1:39377";
const mockUrl = "http://127.0.0.1:39378";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: "list",
  use: {
    baseURL: appUrl,
    ...devices["Desktop Chrome"],
    trace: "retain-on-failure",
  },
  globalTeardown: "./tests/e2e/teardown.ts",
  webServer: [
    {
      command: "node tests/e2e/mock-services.mjs",
      url: `${mockUrl}/health`,
      reuseExistingServer: false,
      env: { LYRIC_SYNC_E2E_ROOT: testRoot },
    },
    {
      command: "pnpm exec next dev --hostname 127.0.0.1 --port 39377",
      url: `${appUrl}/setup`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        DATABASE_URL: `file:${join(testRoot, "e2e.db")}`,
        LRCLIB_BASE_URL: mockUrl,
        LYRIC_SYNC_MUSIC_SOURCE_ROOT: join(testRoot, "music"),
        LYRIC_SYNC_MUSIC_MIRROR_ROOT: join(testRoot, "mirror"),
      },
    },
  ],
});
