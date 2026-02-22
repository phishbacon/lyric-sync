# AGENTS.md

## Project Overview

Lyric-Sync is a self-hosted web application that automatically downloads and syncs lyrics to music files in Plex media server libraries. It connects to a Plex server, reads music library metadata (artists, albums, tracks), fetches synced (`.lrc`) or plain-text (`.txt`) lyrics from [lrclib.net](https://lrclib.net/), and writes them next to the music files on disk.

## Tech Stack

- **Framework**: SvelteKit v2 with Svelte 5 (runes API: `$state`, `$derived`, `$props`)
- **Language**: TypeScript (strict mode)
- **UI**: Skeleton UI v4 (wintry dark theme), Tailwind CSS v4, Lucide icons
- **Database**: SQLite via Drizzle ORM with LibSQL client
- **Validation**: Zod v4 (env vars, forms, API data) + drizzle-zod
- **Logging**: Pino
- **Package Manager**: pnpm (enforced; do not use npm or yarn)
- **Build**: Vite with `@sveltejs/adapter-node`

## Project Structure

```
src/
  app.html                    # Root HTML template
  app.d.ts                    # SvelteKit type declarations
  lib/
    components/               # Svelte UI components (PascalCase filenames)
    plex-api-types/           # TypeScript interfaces for Plex API responses
    server/
      db/
        index.ts              # DB connection + auto-migration
        migrations/           # SQL migration files (do not edit manually)
        query-utils.ts        # Reusable DB query functions
      env.ts                  # Environment variable validation (Zod)
    schema.ts                 # Drizzle ORM database schema + Zod schemas
    logger.ts                 # Pino logger (browser + server)
    types.ts                  # Shared TypeScript types/interfaces
    uuid-encoder.ts           # Base64 URL-safe encode/decode for Plex IDs
    toaster.ts                # Toast notification manager
    image-utils.ts            # Image URL helpers
    external-links.ts         # External URL constants
  routes/                     # SvelteKit file-based routing
    add-server/               # Server configuration page
    select-library/           # Library selection page
    view-library/             # Library browsing (artists -> albums -> tracks)
      artist/[uuid]/          # Artist detail page
      album/[uuid]/           # Album detail page with lyric sync controls
    api/
      get-latest-plex-data/   # GET: fetch + upsert Plex data to DB
      sync-lyrics/track/      # POST: fetch lyrics from lrclib, write to disk
```

## Code Conventions

### Style Rules (enforced by ESLint via `@antfu/eslint-config`)

- **Semicolons**: required
- **Quotes**: double quotes
- **Indentation**: 2 spaces
- **Imports**: auto-sorted by `perfectionist/sort-imports`
- **File naming**: kebab-case for TypeScript/JS files; PascalCase for `.svelte` components
- **No `console.log`**: use the Pino logger from `$lib/logger.ts` instead (`no-console` rule is set to warn)
- **No `process.env` access**: use `$lib/server/env.ts` instead (`node/no-process-env` rule is set to error)

### TypeScript

- Strict mode is enabled with `noImplicitAny` and `noImplicitReturns`
- Use explicit type annotations on function parameters and return types
- Use Zod schemas for runtime validation at all data boundaries (env, forms, API responses)

### Svelte

- Use Svelte 5 runes (`$state`, `$derived`, `$props`, `$derived.by`) — do not use legacy Svelte 4 reactive syntax (`$:`, `export let`)
- Skeleton UI components and Tailwind utility classes for styling

### Database

- Schema is defined in `src/lib/schema.ts` using Drizzle ORM
- Migrations are generated with `pnpm db:generate` and run with `pnpm db:migrate`
- All foreign keys use `onDelete: "cascade"`
- Column naming uses snake_case (configured in `drizzle.config.ts`)
- Never edit migration files in `src/lib/server/db/migrations/` manually

## Commands

| Command | Purpose |
|---|---|
| `pnpm dev` | Start dev server |
| `pnpm build` | Production build |
| `pnpm preview` | Preview production build |
| `pnpm check` | TypeScript + Svelte type checking |
| `pnpm lint` | Run ESLint |
| `pnpm lint:fix` | Auto-fix lint issues |
| `pnpm db:generate` | Generate migration files from schema changes |
| `pnpm db:migrate` | Run database migrations |
| `pnpm db:push` | Push schema directly to database |
| `pnpm db:studio` | Open Drizzle Studio (DB GUI) |

## Environment Variables

- `DATABASE_URL` — SQLite connection string (e.g., `file:lyric-sync.db`)
- `ORIGIN` — Allowed origin for CSRF protection (e.g., `http://localhost:3000`)
- `NODE_ENV` — `development` or `production`

See `.env.example` for the template.

## Git Conventions

- **Commit messages**: Conventional Commits format (`feat:`, `fix:`, `chore:`, `style:`, `ci:`)
- **Commitizen**: Use `cz-conventional-changelog` for standardized commits
- **Branch naming**: descriptive with underscores (e.g., `add_full_artist_sync_functionality`)
- **Main branch**: `main`
- **Versioning**: Automated semantic versioning via semantic-release

## CI/CD

Three GitHub Actions workflows:

1. **Docker Publish** — Builds and pushes Docker image to `ghcr.io/phishbacon/lyric-sync` on pushes to `main`, `alpha`, `hotfix`, and version tags
2. **ESLint** — Runs ESLint on pushes and PRs to `main`, uploads SARIF results to GitHub Code Scanning
3. **Semantic Release** — Automated versioning on pushes to `main`, `alpha`, `hotfix`

## Testing

No test framework is currently configured. The `tsconfig.json` includes a `./tests/**/*.ts` path, indicating tests are planned.

## Terminology

- **"Fetching data from Plex"** / **"Plex fetch"** — Syncing the local SQLite database with the Plex API. This means calling the Plex server to get the latest artists, albums, and tracks, then upserting that data into our database (handled by `/api/get-latest-plex-data` and `+layout.server.ts`).
- **"Sync"** (in any other context) — Downloading lyrics for music tracks from lrclib.net and writing `.lrc` or `.txt` files to disk next to the music files.

## Common Workflows

### Adding a new page

1. Create a new directory under `src/routes/` following SvelteKit file-based routing conventions
2. Add `+page.svelte` for the UI and `+page.server.ts` for server-side data loading
3. For API endpoints, create `+server.ts` files under `src/routes/api/`

### Modifying the database schema

1. Edit `src/lib/schema.ts`
2. Run `pnpm db:generate` to create a new migration
3. Run `pnpm db:migrate` to apply it
4. Update query functions in `src/lib/server/db/query-utils.ts` as needed

### Adding a new component

1. Create a PascalCase `.svelte` file in `src/lib/components/`
2. Use Svelte 5 runes for reactivity
3. Use Skeleton UI components and Tailwind classes for styling
