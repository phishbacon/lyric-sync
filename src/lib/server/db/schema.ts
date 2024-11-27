import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const users = sqliteTable("users", {
  id: integer({ mode: "number" })
    .primaryKey({ autoIncrement: true }),
  username: text()
    .notNull()
    .unique(),
  passHash: text()
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
    passHash: schema => schema.passHash.min(1),
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
  url: text()
    .notNull(),
  port: integer({ mode: "number" })
    .notNull(),
  token: text()
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
    serverName: schema => schema.serverName.min(1),
  },
)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  });

export const patchServerSchema = insertServerSchema.partial();
