# Lyric-Sync

![Docker CI badge](https://github.com/phishbacon/lyric-sync/actions/workflows/docker-publish.yml/badge.svg)
![Lint badge](https://github.com/phishbacon/lyric-sync/actions/workflows/eslint.yml/badge.svg)

Lyric-Sync is a free, open-source, self-hosted app that finds lyrics for tracks in your Plex music library and saves them alongside your music files. It queries [LrcMux](https://lrcmux.dev/), which aggregates multiple lyric sources.

This `rewrite` branch uses **Next.js 16 (App Router)**, **React 19**, **Tailwind CSS 4**, **Drizzle ORM**, and **SQLite via libSQL**. The published `ghcr.io/phishbacon/lyric-sync:main` image follows the `main` branch; build this branch locally to try the rewrite until it is released.

Inspired by [lrcget](https://github.com/tranxuanthang/lrcget), a desktop alternative for downloading lyrics. Its creator also runs LRCLIB.

## Features

- Connect a Plex Media Server through Plex account authentication and select a music library.
- Browse artists, albums, and tracks with lyric sync status.
- Import and refresh library metadata from Plex in background jobs.
- Sync an individual track, album, or artist; view progress as jobs finish.
- Save synchronized lyrics as `.lrc` files or plain lyrics as `.txt` files beside the audio file. Existing lyric files are recognized when importing tracks.
- Configure the LrcMux instance, available sources, and synchronized lyric preference in Settings.

Lyrics are fetched exclusively through LrcMux's native `/get` endpoint. The Settings page lets you enable one or more sources provided by LrcMux, customize its API URL, test the connection, and opt in to synchronized lyrics (off by default). With synchronization enabled, LrcMux prefers word timing, then line timing, then plain text; otherwise lyrics are saved as plain `.txt`. LrcMux decides source ranking. The app checks `/sources` and skips sources unavailable on the configured instance. For example, LRCLIB may be available as an LrcMux source on some instances, but the app does not contact LRCLIB directly.

Artist, title, and duration must match before a file is saved. Provider outages remain retryable instead of marking a track as permanently missing lyrics. Changing settings makes previously missing lyrics eligible for later batch syncs; it does not immediately start jobs or overwrite existing lyric files. Restore Defaults fills in the form and requires Save Changes. `LRCMUX_BASE_URL` sets the initial/default endpoint (default: `https://api.lrcmux.dev`); saved Settings take precedence.

## Before upgrading from the older app

**Back up both the application database and your music directory before switching versions.** The Next.js rewrite uses a different database schema, and **there is no automatic migration of the old SvelteKit database**. Do not point the rewrite at an old `lyric-sync.db`: the new schema migrations may fail or conflict with existing tables. Instead, keep the old database and configure a **new** database file for the rewrite; reconnect Plex and reimport your library. Previously saved `.lrc` and `.txt` files are discovered during import.

Lyric-Sync **writes lyric files beside your music tracks**. Keep backups and make sure the service has write permission to those directories.

## Docker (Next.js rewrite)

Docker is the recommended deployment method. The app must see every track at **the same absolute path Plex reports**. For example, if Plex reports `/music/Artist/Album/song.flac`, mount your music so that exact path exists inside Lyric-Sync; mounting it only at `/data/music` will not work. The container must be able to write to the music directory and its database directory (the image runs as UID 1000).

To build this branch, create a `compose.yaml` alongside the repository's `Dockerfile`:

```yaml
services:
  lyric-sync:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: file:/app/data/lyric-sync.db
    volumes:
      - ./data:/app/data
      # Change BOTH paths to the absolute path Plex uses for your tracks.
      - /music:/music
    restart: unless-stopped
```

Create the database directory, then start the service:

```bash
mkdir -p data
docker compose up -d --build
```

The container runs as UID 1000, which needs write access to `data/` and the mounted music tree. If your host user has a different UID, adjust the directory permissions accordingly. For a **new, empty** `data/` directory, `sudo chown 1000:1000 data` is one option; you do not need to change ownership of your entire music library.

Open `http://localhost:3000` (or your server's address), authenticate with Plex, test the connection, and select a library. The database migrations run when the Node.js server starts. Keep `data/` persistent across container replacements.

If you use a reverse proxy, forward requests to port `3000` and preserve the request host and protocol. The old SvelteKit `ORIGIN` setting is no longer used.

## Run locally

Requires **Node.js 22 or later** and **pnpm 11.21.0** (the version declared by `packageManager`).

```bash
git clone https://github.com/phishbacon/lyric-sync.git
cd lyric-sync
git checkout rewrite
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env
```

The sample `.env` sets `DATABASE_URL=file:lyric-sync.db`. Set it to a separate file if an older installation is present, such as `DATABASE_URL=file:lyric-sync-next.db`. Run a development server:

```bash
pnpm dev
```

For a production-style local build:

```bash
pnpm build
pnpm start
```

Both listen on port `3000` by default. A separate development Docker stack is also provided in `docker-compose.dev.yaml`; set `DATA_ROOT` to the absolute Plex music root in a `.env` file (for example, `DATA_ROOT=/music`), then run `docker compose -f docker-compose.dev.yaml up --build`. It listens on host port `3001` and uses its own `lyric-sync-dev.db`. **That stack mounts the real music tree and can write lyric files to it.**

### Preview with an isolated music mirror

To develop against an imported Plex library without writing lyrics to the real music directory, run the Next.js dev server on the host with a separate database and two music-mirror environment variables:

```bash
DATABASE_URL=file:/absolute/path/to/preview.db \
LYRIC_SYNC_MUSIC_SOURCE_ROOT=/path/to/plex/music \
LYRIC_SYNC_MUSIC_MIRROR_ROOT=/absolute/path/to/mirror/music \
pnpm dev --hostname 0.0.0.0 --port 3003
```

Replace all `/absolute/path/...` and `/path/to/...` placeholders with paths on your machine. `LYRIC_SYNC_MUSIC_SOURCE_ROOT` is the absolute prefix in the Plex track paths, and `LYRIC_SYNC_MUSIC_MIRROR_ROOT` is a writable directory containing only preview lyric files and directory structure. Configure **both** variables together. Disk checks, `.lrc`/`.txt` writes, and newly created album directories use the mirror; paths outside the configured source prefix are rejected. The mirror does not need copies of the audio files. Keep the preview database separate from production, and do not mount the production music tree into this preview.

## Development and contributing

This project uses Next.js App Router with server components, server actions, and a background job worker. SQLite database migrations live under `src/lib/server/db/migrations` and run at server startup. If you change the schema, generate the matching migration with `pnpm db:generate` and review it before committing.

Enable the repository's privacy hooks once per clone:

```bash
git config --local core.hooksPath .githooks
```

The `pre-commit` hook audits staged Git blobs. The `pre-push` hook checks all blobs introduced by outgoing commits, including files deleted in a subsequent commit. Both block suspicious credentials, private host addresses, personal home paths, and sensitive file types. Only file paths and rule names are reported; suspected secret values are never printed. These checks use Python 3, are deliberately conservative, and cannot guarantee that all private information is detected. Keep real credentials and machine-specific configuration outside Git.

```bash
pnpm check      # TypeScript
pnpm lint       # ESLint
pnpm test       # Vitest unit tests
pnpm test:e2e   # Playwright browser tests (installs Chromium separately)
pnpm build      # Production Next.js build
```

For browser tests, install Chromium once with `pnpm exec playwright install chromium` (CI also installs browser system dependencies). E2E tests use a temporary SQLite database, a local fake Plex server, and mock lyrics providers, so they never need your Plex account or production music library. If another Next.js dev server is running from the same checkout, run `pnpm build` followed by `LYRIC_SYNC_E2E_USE_BUILD=1 pnpm test:e2e` to test against that build without stopping the dev server.

Contributions and bug reports are welcome through GitHub issues and pull requests.
