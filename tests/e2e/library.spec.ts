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

    await expect(page.getByRole("link", { name: /Fixture Artist/ })).toContainText("0 / 1 tracks synced");

    await page.getByRole("link", { name: "Albums", exact: true }).click();
    await expect(page.getByRole("link", { name: /Fixture Album/ })).toContainText("0 / 1 tracks synced");
    await page.getByRole("textbox", { name: "Search albums" }).fill("Fixture Artist");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page).toHaveURL(/\/library\/albums\?q=Fixture\+Artist/);
    await expect(page.getByRole("link", { name: /Fixture Album/ })).toBeVisible();
    await page.getByRole("link", { name: "Tracks", exact: true }).click();
    await page.getByRole("link", { name: "Albums", exact: true }).click();
    await expect(page).toHaveURL(/\/library\/albums\?q=Fixture\+Artist/);
    await expect(page.getByRole("textbox", { name: "Search albums" })).toHaveValue("Fixture Artist");
    await page.getByRole("textbox", { name: "Search albums" }).fill("No such album");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page).toHaveURL(/\/library\/albums\?q=No\+such\+album/);
    await expect(page.getByText(/No albums match your filters/)).toBeVisible();
    await page.getByRole("button", { name: "Clear Filters" }).click();
    await page.getByRole("link", { name: "Tracks", exact: true }).click();
    await expect(page.getByRole("row", { name: /Example Track/ })).toBeVisible();
    await page.getByRole("combobox", { name: "Filter synchronization" }).selectOption("unsynced");
    await expect(page).toHaveURL(/status=unsynced/);
    await expect(page.getByRole("row", { name: /Example Track/ })).toBeVisible();
    await page.getByRole("link", { name: "Albums", exact: true }).click();
    await page.getByRole("link", { name: "Tracks", exact: true }).click();
    await expect(page).toHaveURL(/status=unsynced/);
    await expect(page.getByRole("combobox", { name: "Filter synchronization" })).toHaveValue("unsynced");
    await page.getByRole("combobox", { name: "Filter synchronization" }).selectOption("failed");
    await expect(page.getByText(/No tracks match your search or filters/)).toBeVisible();
    await page.getByRole("button", { name: "Clear Filters" }).click();
    await page.getByRole("link", { name: "Example Track" }).first().click();
    await expect(page).toHaveURL(/\/library\/album\/[^/]+#track-/);
    await expect(page.locator("tr:target")).toContainText("Example Track");

    await page.goto("/library");

    await page.getByRole("link", { name: /Fixture Artist/ }).click();
    await page.getByRole("link", { name: /Fixture Album/ }).click();
    await expect(page.getByText("Example Track")).toBeVisible();
    await expect(page.getByText("Pending", { exact: true })).toBeVisible();

    // Opt in to timestamped lyrics and persist source configuration.
    await page.goto("/settings");
    await page.getByLabel("Prefer synchronized lyrics").check();
    await page.getByRole("button", { name: "Test connection" }).last().click();
    await expect(page.getByText("Connected — 1 active sources")).toBeVisible();
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status")).toHaveText("LrcMux settings saved");
    await expect(page.getByLabel("Prefer synchronized lyrics")).toBeChecked();
    await page.goto("/library");
    await page.getByRole("link", { name: /Fixture Artist/ }).click();
    await page.getByRole("link", { name: /Fixture Album/ }).click();

    const idleTrackButton = page.getByRole("button", { name: "Re-check this track's lyrics" });
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
    }, { timeout: 30_000 }).toContain("[00:01.00]<00:01.00>Fixture lyric line");
    // The Plex source tree stays unchanged even though it contains the audio.
    await expect(stat(join(musicRoot, "Example.lrc"))).rejects.toMatchObject({ code: "ENOENT" });

    await expect.poll(async () => {
      await page.reload();
      return page.getByText("Synced", { exact: true }).count();
    }, { timeout: 30_000 }).toBe(1);
    await expect(idleTrackButton).toHaveAttribute("aria-busy", "false");
    await page.goto("/library");
    await expect(page.getByRole("link", { name: /Fixture Artist/ })).toContainText("1 / 1 tracks synced");
  });

  test("persists the task queue, supports Undo, and retries failed batch children", async ({ page }) => {
    await page.goto("/library");
    const taskButton = page.getByRole("button", { name: /Tasks \(\d+ active\)/ });
    await taskButton.click();
    const panel = page.getByRole("dialog", { name: "Task queue" });
    const album = panel.getByRole("article").filter({ hasText: "Album: Fixture Album" });

    await expect(album).toContainText("Completed");
    await album.getByRole("button", { name: "Expand Album: Fixture Album" }).click();
    await expect(album.getByText("Example Track")).toBeVisible();

    await album.getByRole("button", { name: "Dismiss Album: Fixture Album" }).click();
    await expect(album).toHaveCount(0);
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(album).toBeVisible();

    await page.reload();
    await taskButton.click();
    await expect(album).toBeVisible();
    await panel.getByRole("button", { name: "Clear All" }).click();
    await expect(album).toHaveCount(0);

    await page.reload();
    await taskButton.click();
    await expect(album).toHaveCount(0);

    // Create a partially failed batch so the browser can retry only its
    // failed child. The worker will then process the real sync safely in the
    // disposable lyric mirror used by this E2E suite.
    const client = createClient({ url: `file:${join(workDir, "e2e.db")}` });
    const now = Math.floor(Date.now() / 1000);
    const trackResult = await client.execute("SELECT key, album_uuid FROM tracks LIMIT 1");
    const track = trackResult.rows[0];
    const batchResult = await client.execute({
      sql: "INSERT INTO task_batches (scope, target_uuid, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      args: ["album", String(track.album_uuid), "Retry Fixture", now, now],
    });
    const batchId = Number(batchResult.lastInsertRowid);
    await client.execute({
      sql: "INSERT INTO jobs (kind, status, target_uuid, batch_id, attempts, force, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      args: ["sync_track", "failed", String(track.key), batchId, 1, 0, now, now],
    });
    client.close();

    await page.reload();
    await taskButton.click();
    const failedBatch = panel.getByRole("article").filter({ hasText: "Album: Retry Fixture" });
    await expect(failedBatch).toContainText("failed");
    await failedBatch.getByRole("button", { name: "Retry failed Album: Retry Fixture" }).click();
    await expect(failedBatch).toContainText("Completed", { timeout: 30_000 });
  });

  test("changing lyric settings resets missing tracks without starting jobs or rewriting files", async ({ page }) => {
    const client = createClient({ url: `file:${join(workDir, "e2e.db")}` });
    const lyricFile = join(workDir, "mirror", "Example.lrc");
    const original = await readFile(lyricFile, "utf8");
    await client.execute("UPDATE tracks SET sync_status = 'no_lyrics', synced = 0");
    const before = await client.execute(
      "SELECT COUNT(*) AS count FROM jobs WHERE status IN ('queued', 'running')",
    );

    await page.goto("/settings");
    await expect(page.getByLabel("Prefer synchronized lyrics")).toBeChecked();
    await page.getByRole("button", { name: "Restore defaults" }).click();
    await expect(page.getByLabel("Prefer synchronized lyrics")).not.toBeChecked();
    // Restore defaults only edits the form; it does not save on its own.
    const savedBefore = await client.execute("SELECT prefer_synced FROM lyric_settings WHERE id = 1");
    expect(Number(savedBefore.rows[0].prefer_synced)).toBe(1);
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status")).toHaveText("LrcMux settings saved");
    await expect(page.getByLabel("Prefer synchronized lyrics")).not.toBeChecked();

    const updated = await client.execute("SELECT sync_status FROM tracks LIMIT 1");
    expect(updated.rows[0].sync_status).toBe("pending");
    const after = await client.execute(
      "SELECT COUNT(*) AS count FROM jobs WHERE status IN ('queued', 'running')",
    );
    expect(Number(after.rows[0].count)).toBe(Number(before.rows[0].count));
    expect(await readFile(lyricFile, "utf8")).toBe(original);
    client.close();
  });
});
