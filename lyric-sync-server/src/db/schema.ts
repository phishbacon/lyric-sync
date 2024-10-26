import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { Schema } from "zod";

export const users = sqliteTable("users", {
  id: integer("id", { mode: "number" })
    .primaryKey({ autoIncrement: true }),
  username: text("username")
    .notNull()
    .unique(),
  passHash: text("pass_hash")
    .notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .$default(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .$default(() => new Date())
    .$onUpdate(() => new Date()),
});

export const selectUsersSchema = createSelectSchema(users);

export const insertUsersSchema = createInsertSchema(
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
