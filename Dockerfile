# syntax=docker/dockerfile:1

# --- Build: compile the Next.js standalone output -------------------------
FROM node:22-slim AS builder

RUN npm install -g pnpm

WORKDIR /app

# Manifests first, so this layer is cached until dependencies change.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY . .

# The standalone server is self-contained except for the native libsql
# binding, which Next's trace follows via the explicit outputFileTracingIncludes
# in next.config.ts.
RUN pnpm build

# --- Runtime: minimal image, non-root, standalone server ------------------
FROM node:22-slim AS runner

ENV NODE_ENV=production
# Next.js standalone conventions; the compose contract also sets ORIGIN.
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

WORKDIR /app

# `node` user ships in the base image (uid 1000). The SQLite database
# defaults to file:lyric-sync.db inside the workdir, so it must be writable;
# when the compose file points DATABASE_URL inside the bind-mounted music
# directory (/data), that mount is owned by the host user (also uid 1000).
RUN useradd --system --uid 1000 --create-home node \
  && chown -R node:node /app

COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

USER node

EXPOSE 3000

CMD ["node", "server.js"]
