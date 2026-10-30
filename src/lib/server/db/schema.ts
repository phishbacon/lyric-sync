import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
};

export const servers = sqliteTable("servers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  baseUrl: text("base_url").notNull(),
  xPlexToken: text("x_plex_token").notNull(),
  clientIdentifier: text("client_identifier").notNull(),
  ...timestamps,
});

export const libraries = sqliteTable("libraries", {
  uuid: text("uuid").primaryKey(),
  title: text("title").notNull(),
  image: text("image"),
  path: text("path").notNull(),
  key: text("key").notNull().unique(),
  active: integer("active", { mode: "boolean" }).notNull().default(false),
  serverId: integer("server_id")
    .notNull()
    .references(() => servers.id, { onDelete: "cascade" }),
  ...timestamps,
});

export const artists = sqliteTable("artists", {
  uuid: text("uuid").primaryKey(),
  title: text("title").notNull(),
  image: text("image"),
  summary: text("summary"),
  key: text("key").notNull().unique(),
  libraryUuid: text("library_uuid")
    .notNull()
    .references(() => libraries.uuid, { onDelete: "cascade" }),
  ...timestamps,
});

export const albums = sqliteTable("albums", {
  uuid: text("uuid").primaryKey(),
  title: text("title").notNull(),
  image: text("image"),
  summary: text("summary"),
  key: text("key").notNull().unique(),
  synced: integer("synced", { mode: "boolean" }).notNull().default(false),
  libraryUuid: text("library_uuid")
    .notNull()
    .references(() => libraries.uuid, { onDelete: "cascade" }),
  artistUuid: text("artist_uuid")
    .notNull()
    .references(() => artists.uuid, { onDelete: "cascade" }),
  ...timestamps,
});

export const tracks = sqliteTable("tracks", {
  // Per-entry identity: Plex's ratingKey (/library/metadata/...), unique per
  // library entry. The guid below is content-based and shared across albums
  // (a compilation re-lists the same recording), and one recording can be
  // many files — each file needs its own row, path, and lyrics.
  key: text("key").primaryKey(),
  // plex:// recording guid — not unique; kept as the join chain to
  // artist/album (track.grandparentGuid === artist.guid, etc.).
  uuid: text("uuid").notNull(),
  title: text("title").notNull(),
  path: text("path"),
  duration: integer("duration"),
  trackNumber: integer("track_number").notNull().default(0),
  synced: integer("synced", { mode: "boolean" }).notNull().default(false),
  syncStatus: text("sync_status", {
    enum: [
      "pending",
      "synced",
      "no_lyrics",
      "error",
    ],
  })
    .notNull()
    .default("pending"),
  libraryUuid: text("library_uuid")
    .notNull()
    .references(() => libraries.uuid, { onDelete: "cascade" }),
  artistUuid: text("artist_uuid")
    .notNull()
    .references(() => artists.uuid, { onDelete: "cascade" }),
  albumUuid: text("album_uuid")
    .notNull()
    .references(() => albums.uuid, { onDelete: "cascade" }),
  ...timestamps,
});

export const jobs = sqliteTable("jobs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  kind: text("kind", {
    enum: ["sync_track", "plex_fetch"],
  }).notNull(),
  status: text("status", {
    enum: ["queued", "running", "done", "failed"],
  })
    .notNull()
    .default("queued"),
  attempts: integer("attempts").notNull().default(0),
  targetUuid: text("target_uuid"),
  // sync_track only: a manual per-track sync always re-asks lrclib, even for
  // tracks whose .txt already counts as synced in batch runs.
  force: integer("force", { mode: "boolean" }).notNull().default(false),
  error: text("error"),
  startedAt: integer("started_at", { mode: "timestamp" }),
  finishedAt: integer("finished_at", { mode: "timestamp" }),
  ...timestamps,
});

export type Server = typeof servers.$inferSelect;
export type Library = typeof libraries.$inferSelect;
export type Artist = typeof artists.$inferSelect;
export type Album = typeof albums.$inferSelect;
export type Track = typeof tracks.$inferSelect;
export type Job = typeof jobs.$inferSelect;
