/* eslint-disable node/no-process-env -- isolated fixture location set by Playwright */
import { createClient } from "@libsql/client";
import { expect, test } from "@playwright/test";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

const workDir = process.env.LYRIC_SYNC_E2E_ROOT;
if (!workDir) {
  throw new Error("Tests must run via playwright.config.ts");
}

test.describe.serial("fresh Next.js installation", () => {
  test("directs an unconfigured installation to Plex setup", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/setup$/);
    await expect(page.getByRole("heading", { name: "Set up Lyric-Sync" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Authenticate with Plex" })).toBeVisible();
  });

  test("imports a mocked Plex library and syncs an album into the lyric mirror", async ({ page }) => {
    const musicRoot = join(workDir, "music");
    await mkdir(musicRoot, { recursive: true });
    await writeFile(join(musicRoot, "Example.flac"), "isolated fixture audio");

    // Pretend the Plex account handshake has completed. The browser still
    // drives real library selection, ingestion, jobs and lyric disk writes.
    const client = createClient({ url: `file:${join(workDir, "e2e.db")}` });
    const now = Math.floor(Date.now() / 1000);
    await client.execute({
      sql: "INSERT INTO servers (name, base_url, x_plex_token, client_identifier, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      args: ["Fixture Plex", "http://127.0.0.1:39378", "fixture-token", "fixture-client", now, now],
    });
    client.close();

    await page.goto("/setup/select-library");
    await page.getByRole("button", { name: "Load libraries from Plex" }).click();
    await page.getByRole("button", { name: /Fixture Library/ }).click();
    await page.getByRole("button", { name: "Use this library" }).click();
    await expect(page).toHaveURL(/\/library$/);

    await expect.poll(async () => {
      await page.reload();
      return page.getByRole("link", { name: /Fixture Artist/ }).count();
    }, { timeout: 30_000 }).toBe(1);

    await page.getByRole("link", { name: /Fixture Artist/ }).click();
    await page.getByRole("link", { name: /Fixture Album/ }).click();
    await expect(page.getByText("Example Track")).toBeVisible();
    await expect(page.getByText("Pending", { exact: true })).toBeVisible();

    const idleTrackButton = page.getByRole("button", { name: "Re-check this track's lyrics against lrclib" });
    await expect(idleTrackButton).toHaveAttribute("aria-busy", "false");
    await page.getByRole("button", { name: "Sync All" }).click();
    const syncingTrackButton = page.getByRole("button", { name: "Syncing lyrics for this track" });
    await expect(syncingTrackButton).toHaveAttribute("aria-busy", "true");
    await expect(syncingTrackButton.locator("svg")).toHaveClass(/animate-spin/);

    const lyricFile = join(workDir, "mirror", "Example.lrc");
    await expect.poll(async () => {
      try {
        return await readFile(lyricFile, "utf8");
      } catch {
        return "";
      }
    }, { timeout: 30_000 }).toContain("[00:01.00]Fixture lyric line");
    // The Plex source tree stays unchanged even though it contains the audio.
    await expect(stat(join(musicRoot, "Example.lrc"))).rejects.toMatchObject({ code: "ENOENT" });

    await expect.poll(async () => {
      await page.reload();
      return page.getByText("Synced", { exact: true }).count();
    }, { timeout: 30_000 }).toBe(1);
    await expect(idleTrackButton).toHaveAttribute("aria-busy", "false");
  });
});
