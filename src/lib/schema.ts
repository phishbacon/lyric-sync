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

export const patchServerSchema = insertServerSchema.partial();
