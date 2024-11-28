import * as schema from "$lib/schema";
import env from "$lib/server/env";
import { drizzle } from "drizzle-orm/libsql";

const db = drizzle({
  connection: env.DATABASE_URL,
  casing: "snake_case",
  schema,
});

export default db;
