# Lyric-Sync Next.js Rewrite Plan

Status: agreed design, awaiting implementation.
Branch: `rewrite` (this repository; old code deleted from `main` on ship, preserved in git history).

---

## 1. Goal

From-scratch rewrite of Lyric-Sync in Next.js. Zero code carried over from the SvelteKit branch. Working feature parity with today's app, plus the dead features wired up and a proper sync engine. Entirely new visual design.

**What the app does:** connects to one Plex server, ingests a selected music library's artists/albums/tracks into SQLite, browses them in a web UI, and for each track fetches lyrics from lrclib.net, writing `.lrc` (synced) or `.txt` (plain) files next to the audio files on disk.

## 2. Scope

### In scope (parity + fixes)

- One Plex server per instance; multiple ingested libraries with one active at a time.
- Onboarding: plex.tv PIN OAuth, connection test, save server, select library.
- Library browsing: artists grid → album grid → track table.
- Per-track sync, per-track disk-truth check, album "Sync All", **artist "Sync All" (exists today as a dead button — wired in rewrite)**.
- Card-level sync progress (albums synced / tracks synced ratios).
- Settings page (**new** — replaces today's dead nav link): test connection, re-authenticate, rename server, trigger Plex refetch.
- Disk-first reconciliation: existing `.lrc`/`.txt` files next to tracks count as synced with zero network requests.
- Token-safe artwork proxy, SSE progress, queued background sync.

### Out of scope (non-goals)

- Multiple simultaneous Plex servers.
- More than one concurrently active library.
- Library-wide "sync everything" button (footgun without a queue dashboard; add later if demanded).
- Path remapping (the identical-absolute-path bind-mount invariant stays).
- App-level user accounts/auth (LAN or reverse-proxy hosted, as today).
- Data migration from the old SQLite schema (fresh DB; re-ingest from Plex).
- Dedicated job-admin dashboard page (header indicator + per-page bars only).

## 3. Tech stack

All packages at their latest versions, verified mutually compatible via npm peer-dependency metadata (2026-10-28):

| Package | Version | Verified compatibility |
|---|---|---|
| `next` | 16.4.3 | App Router, Server Components, Server Actions; supports TS 7 in `next build` |
| `react` / `react-dom` | 19.3.1 | next peer: `^19.0.0` ✓ |
| `typescript` | 7.0.2 | native compiler; Next 16.3+ invokes installed `tsc` directly |
| `drizzle-orm` | 0.45.4 | libsql peer: `>=0.10.0` ✓ |
| `@libsql/client` | 0.18.0 | — |
| `drizzle-kit` | 0.31.11 | — |
| `drizzle-zod` | 0.8.3 | zod peer `^4.0.0` ✓, drizzle-orm peer `>=0.36.0` ✓ — no fallback needed |
| `zod` | 4.6.7 | latest; use `z.compile()` for hot-path schemas (per-track sync loop) |
| `tailwindcss` | 4.3.3 | shadcn/ui supports Tailwind v4 |
| `pino` | 10.4.0 | — |
| `vitest` | 5.0.5 | vite peer `^8.0.0` ✓ (vite 8.3.5) |
| `@playwright/test` | 1.64.1 | next peer `^1.51.1` ✓ |
| `eslint` | 10.13.0 | antfu config peer `^10.0.0` ✓ |
| `@antfu/eslint-config` | 10.0.0 | — |

Zod is used at every boundary: env, Plex JSON (closes today's unvalidated TODOs), lrclib responses, Server Action inputs. Styling: Tailwind v4 + shadcn/ui (copy-in components, fully owned). Build: Next standalone output, multi-stage Docker, non-root `node` user.

### Design direction

Dark-first, dense, media-library aesthetic adjacent to Plex's own web UI: near-black surfaces, artwork-forward cards, minimal chrome. Light theme only on future demand.

## 4. Routes

| Route | Type | Purpose |
|---|---|---|
| `/` | redirect | No server → `/setup`; else → active library |
| `/setup` | page | Onboarding: Plex OAuth, test connection, save server |
| `/setup/select-library` | page | Library picker; selecting enqueues the Plex-fetch job |
| `/library` | page | Artists grid for the active library |
| `/library/artist/[id]` | page | Albums grid + working "Sync All" |
| `/library/album/[id]` | page | Track table + per-track sync/check + "Sync All" |
| `/settings` | page | Test connection, re-auth, rename, refetch |
| `/api/image/[...path]` | Route Handler | Artwork proxy (token stays server-side) |
| `/api/sync/events` | Route Handler | Single global SSE stream |

- URL IDs: URL-safe base64 Plex GUIDs (rewritten encoder, same concept as today).
- Mutations (setup, library selection, sync enqueue, settings) are Server Actions. SSE and the image proxy are Route Handlers.
- One global SSE stream per browser tab; clients filter by ancestry UUID passed as an EventSource query param.

## 5. Data model (fresh schema)

All FKs `onDelete: cascade`. snake_case. No dead tables (no `users`).

- **`servers`** — one row: `base_url` (normalized full URL, e.g. `https://192.168.1.10:32400` — fixes today's scheme-less hostname+port concat bug), `x_plex_token`, `client_identifier`, `name`, timestamps.
- **`libraries`** — `uuid` PK, `title`, `image`, `path`, `key`, `active` bool, FK `server`, timestamps.
- **`artists`** — `uuid` PK, `title`, `image`, `summary`, `key`, FK `library`, timestamps. No `synced` column — artist progress is derived from album counts (as today).
- **`albums`** — `uuid` PK, `title`, `image`, `summary`, `key`, `synced` bool, FKs `library`/`artist`, timestamps.
- **`tracks`** — `uuid` PK, `title`, `key`, `path` (**nullable** — degenerate Plex rows ingested, sync fails loudly with "no file path from Plex"), `duration` (ms), `track_number`, `synced` bool, `sync_status` text (`pending` / `synced` / `no_lyrics` / `error`), FKs `library`/`artist`/`album`, timestamps.
  - `sync_status = no_lyrics` is the deliberate addition over today's model: instrumental/permanently-missing tracks are never re-queried, preserving the no-unnecessary-requests guarantee.
- **`jobs`** — `id`, `kind` (`sync_track` / `plex_fetch`), `status` (`queued` / `running` / `done` / `failed`), `attempts`, `target_uuid` (nullable), `error`, `created_at` / `started_at` / `finished_at`.

## 6. Sync engine

- **Worker:** in-process, started from `instrumentation.ts`, polls the `jobs` table. One container remains the deployment unit.
- **Concurrency:** sequential, one job at a time, minimum ~1 second gap between lrclib requests (their stated courtesy limit).
- **Disk-first reconciliation (new feature):** before any lrclib request, check for `.lrc` then `.txt` next to the track's audio file. Either present → job completes instantly as synced, zero network traffic. The same check runs during Plex ingestion, so hand-placed lyric files are counted from the moment a library is ingested.
- **txt → lrc upgrade rule:** a `.txt`-only track counts as synced and batch syncs skip it. A *manual* per-track sync always forces a fresh lrclib attempt; on success the `.lrc` is written alongside the existing `.txt` (never delete user files; players prefer `.lrc`).
- **Matching:** lrclib `/api/get` (exact artist + album + title + duration) first. On miss, fall back to `/search` and accept the best result **only if** normalized artist and title match and duration is within ±3 seconds. Nothing looser — wrong lyrics on disk are worse than none.
- **Retries:** exponential backoff on 5xx/network errors, max 3 attempts. HTTP 404 = permanent `no_lyrics`, no retry.
- **Batch sync** (album/artist "Sync All") = enqueue one `sync_track` job per unsynced, non-`no_lyrics` track. Server-side now — no N parallel browser POSTs.

## 7. Plex integration

- **Auth:** plex.tv PIN OAuth (create PIN → user opens `app.plex.tv/auth` → poll → token). Token stored server-side only; every Plex call passes `X-Plex-Token`. 401 anywhere → client re-auth banner flow.
- **Ingestion (plex_fetch job):** paged enumeration via `X-Plex-Container-Start`/`Size` headers (~500 items/request) for type=8 artists, type=9 albums, type=10 tracks. Each batch upserted incrementally; batch completion drives the SSE progress counter. Orphan detection is set-based (today's is O(n²)), run per level during that library's fetch only.
- **Auth failure mid-job:** job fails immediately with "authentication expired", surfaced via SSE + banner. After re-auth, user re-enqueues; the fetch restarts from the beginning — safe because all upserts are idempotent. No silent refresh, no auto-resume.
- **Library switching:** instant DB update, no job — data is already ingested. Deep links are keyed by library UUID and keep working.
- **Images:** all artwork served through `/api/image/[...path]` — the proxy fetches from Plex server-side and streams back. Token never reaches the browser (fixes today's token-in-`img src`/browser-history leak), enables HTTP caching and lazy loading.

## 8. Environment & deployment

- Env: `DATABASE_URL` (default `file:lyric-sync.db`, compose example points it inside the mounted music directory for persistence), `PORT`, `HOSTNAME` (Next standalone conventions).
- Docker: multi-stage build, standalone output, non-root `node` user, port 3000. Music library bind-mounted at the **identical absolute path** (no remapping). Same ghcr publish flow, same branch/tag conventions, same semantic-release versioning.
- CSRF: no `trustedOrigins: "*"` hack — Next origin checks with a correct `ORIGIN`/host config.

### Production (unchanged contract)

The current production deployment (`~/docker/apps/apps.compose.yaml`) runs the published image with:

- `DATABASE_URL=file:/data/lyric-sync.db`
- volume `${DATA_ROOT}:${DATA_ROOT}` (`DATA_ROOT=/data` — the music root, mounted at the identical path)
- port `3000:3000`, external `proxy` network, Traefik rule `Host(\`lyrics.example.com\`)`, `restart: unless-stopped`

The rewrite must drop into this exact service definition unchanged: same image repo, same port, same env names, same mount shape. No compose edits needed when the new image ships.

### Development container (new, required)

The repo ships a `docker-compose.dev.yaml` + `Dockerfile.dev` so the rewrite can be tested against the real Plex server and real music files in the same environment shape as production:

- Builds from local source and runs `next dev` with the source tree bind-mounted for hot reload.
- Same `${DATA_ROOT}:${DATA_ROOT}` identical-path mount — `DATA_ROOT=/data` is the music library root itself, so Plex-reported track paths resolve identically inside the container for real lyric writes.
- **Separate DB file** (`DATABASE_URL=file:/data/lyric-sync-dev.db`) so dev testing never touches the production `lyric-sync.db` sitting in the same mount.
- Port `3001:3000` so the dev container runs alongside the existing production container without clashing; Traefik labels omitted (localhost access only).
- `DATABASE_URL`, `PORT`, `HOSTNAME` overridable via env for quick iterations.

This container is the vehicle for the Playwright smoke tests' manual counterpart: onboarding, ingestion, and a real end-to-end track sync against live Plex/lrclib before any merge to `main`.

## 9. Testing

- **Vitest:** lyric matching (normalization, ±3s duration gate), path resolution, Plex response mapping (Zod parse fixtures), base64 URL encoder, job state transitions, disk-first reconciliation logic.
- **Playwright smoke:** onboarding flow and album sync against mocked Plex + lrclib servers.
- CI: existing three workflows adapted in place — Docker publish (unchanged registry), ESLint → ESLint + Vitest + Playwright, semantic-release (unchanged branches).

## 10. Rollout

1. Long-lived `rewrite` branch; CI green from first commit.
2. Milestones: (a) skeleton + schema + onboarding, (b) ingestion + browsing, (c) sync engine + SSE, (d) settings + image proxy + polish, (e) tests + Docker hardening, (f) design pass.
3. Ship: merge to `main`, old SvelteKit code deleted in the same merge (git history is the archive), Docker image replaces the old one under the same ghcr repo.

## 11. Known accepted tradeoffs

- Fresh DB forces existing users to re-ingest once (cheap, self-healing).
- Sequential ~1 req/s worker means a 5,000-track sync takes ~1.5 hours in the background — accepted for a homelab tool.
- No app auth by design; deployment remains the user's LAN/proxy responsibility.
- TypeScript 7 is new in the Next ecosystem; if `next build` hits a TS 7 edge case, dropping to typescript 5.9.x is the one-version fallback (Next supports both).
