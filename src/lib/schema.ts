// aint even gonna try with this one
// TODO: Default images to a static asset
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const users = sqliteTable("users", {
  id: integer({ mode: "number" })
    .primaryKey({ autoIncrement: true }),
  username: text()
    .notNull()
    .unique(),
  password: text()
    .notNull(),
  createdAt: integer({ mode: "timestamp_ms" })
    .$default(() => new Date()),
  updatedAt: integer({ mode: "timestamp_ms" })
    .$default(() => new Date())
    .$onUpdate(() => new Date()),
});

export const selectUserSchema = createSelectSchema(users);

export const insertUserSchema = createInsertSchema(
  users,
  {
    username: schema => schema.username.min(1),
    password: schema => schema.password.min(1),
  },
)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  });

export const servers = sqliteTable("servers", {
  id: integer({ mode: "number" })
    .primaryKey({ autoIncrement: true }),
  serverName: text()
    .notNull()
    .unique(),
  hostname: text()
    .notNull(),
  port: integer({ mode: "number" })
    .notNull(),
  xPlexToken: text()
    .notNull(),
  createdAt: integer({ mode: "timestamp_ms" })
    .$default(() => new Date()),
  updatedAt: integer({ mode: "timestamp_ms" })
    .$default(() => new Date())
    .$onUpdate(() => new Date()),
});

export const selectServerSchema = createSelectSchema(servers);

export const insertServerSchema = createInsertSchema(
  servers,
  {
    serverName: schema => schema.serverName.min(1, "Server name is required"),
    hostname: schema => schema.hostname.min(1, "Hostname is required"),
    port: schema => schema.port.min(1, "Use a better port"),
    xPlexToken: schema => schema.xPlexToken.min(1, "Token is required"),
  },
)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  });

export const updateServerSchema = insertServerSchema.partial();

export const libraries = sqliteTable("libraries", {
  title: text()
    .notNull(),
  uuid: text()
    .primaryKey(),
  image: text(),
  path: text()
    .notNull(),
  key: text()
    .unique()
    .notNull(),
  currentLibrary: integer({ mode: "boolean" })
    .default(false)
    .notNull(),
  serverName: text()
    .notNull()
    .references(() => servers.serverName, { onDelete: "cascade" }),
  createdAt: integer({ mode: "timestamp_ms" })
    .$default(() => new Date()),
  updatedAt: integer({ mode: "timestamp_ms" })
    .$default(() => new Date())
    .$onUpdate(() => new Date()),
});

export const selectLibrarySchema = createSelectSchema(libraries);

export const insertLibrarySchema = createInsertSchema(
  libraries,
  {
    title: schema => schema.title.min(1, "Title is required"),
    uuid: schema => schema.uuid.min(1, "UUID is required"),
    path: schema => schema.path.min(1, "Path is required"),
    key: schema => schema.key.min(1, "Key is required"),
    serverName: schema => schema.serverName.min(1, "Server name is required"),
  },
)
  .omit({
    createdAt: true,
    updatedAt: true,
  });

export const artists = sqliteTable("artists", {
  title: text()
    .notNull(),
  uuid: text()
    .primaryKey(),
  image: text(),
  key: text()
    .unique()
    .notNull(),
  synced: integer({ mode: "boolean" })
    .default(false)
    .notNull(),
  library: text()
    .notNull()
    .references(() => libraries.uuid, { onDelete: "cascade" }),
  summary: text(),
  createdAt: integer({ mode: "timestamp_ms" })
    .$default(() => new Date()),
  updatedAt: integer({ mode: "timestamp_ms" })
    .$default(() => new Date())
    .$onUpdate(() => new Date()),
});

export const selectArtistSchema = createSelectSchema(artists);

export const insertArtistSchema = createInsertSchema(
  artists,
  {
    title: schema => schema.title.min(1, "Title is required"),
    uuid: schema => schema.uuid.min(1, "UUID is required"),
    key: schema => schema.key.min(1, "Key is required"),
    library: schema => schema.library.min(1, "Library uuid is required"),
  },
)
  .omit({
    createdAt: true,
    updatedAt: true,
  });

export const albums = sqliteTable("albums", {
  title: text()
    .notNull(),
  uuid: text()
    .primaryKey(),
  image: text(),
  key: text()
    .unique()
    .notNull(),
  synced: integer({ mode: "boolean" })
    .default(false)
    .notNull(),
  summary: text(),
  library: text()
    .notNull()
    .references(() => libraries.uuid, { onDelete: "cascade" }),
  artist: text()
    .notNull()
    .references(() => artists.uuid, { onDelete: "cascade" }),
  createdAt: integer({ mode: "timestamp_ms" })
    .$default(() => new Date()),
  updatedAt: integer({ mode: "timestamp_ms" })
    .$default(() => new Date())
    .$onUpdate(() => new Date()),
});

export const selectAlbumSchema = createSelectSchema(albums);

export const insertAlbumSchema = createInsertSchema(
  albums,
  {
    title: schema => schema.title.min(1, "Title is required"),
    uuid: schema => schema.uuid.min(1, "UUID is required"),
    key: schema => schema.key.min(1, "Key is required"),
    library: schema => schema.library.min(1, "Library uuid is required"),
    artist: schema => schema.artist.min(1, "Artist uuid is required"),
  },
)
  .omit({
    createdAt: true,
    updatedAt: true,
  });

export const tracks = sqliteTable("tracks", {
  title: text()
    .notNull(),
  uuid: text()
    .primaryKey(),
  key: text()
    .unique()
    .notNull(),
  path: text()
    .notNull(),
  duration: integer()
    .notNull(),
  synced: integer({ mode: "boolean" })
    .default(false)
    .notNull(),
  library: text()
    .notNull()
    .references(() => libraries.uuid, { onDelete: "cascade" }),
  artist: text()
    .notNull()
    .references(() => artists.uuid, { onDelete: "cascade" }),
  album: text()
    .notNull()
    .references(() => albums.uuid, { onDelete: "cascade" }),
  trackNumber: integer()
    .notNull()
    .default(0),
  createdAt: integer({ mode: "timestamp_ms" })
    .$default(() => new Date()),
  updatedAt: integer({ mode: "timestamp_ms" })
    .$default(() => new Date())
    .$onUpdate(() => new Date()),
});

export const selectTrackSchema = createSelectSchema(tracks);

export const insertTrackSchema = createInsertSchema(
  tracks,
  {
    title: schema => schema.title.min(1, "Title is required"),
    uuid: schema => schema.uuid.min(1, "UUID is required"),
    key: schema => schema.key.min(1, "Key is required"),
    path: schema => schema.path.min(1, "Path is required"),
    duration: schema => schema.duration.min(1, "Duration is required"),
    library: schema => schema.library.min(1, "Library uuid is required"),
    artist: schema => schema.artist.min(1, "Artist uuid is required"),
    album: schema => schema.album.min(1, "Album uuid is required"),
    trackNumber: schema => schema.trackNumber.min(1, "Track number is required"),
  },
)
  .omit({
    createdAt: true,
    updatedAt: true,
  });
