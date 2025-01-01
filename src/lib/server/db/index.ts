import type { LibSQLDatabase } from "drizzle-orm/libsql";

import * as schema from "$lib/schema";
import env from "$lib/server/env";
import { drizzle } from "drizzle-orm/libsql";

const db: LibSQLDatabase<typeof schema> = drizzle({
  connection: env.DATABASE_URL,
  casing: "snake_case",
  schema,
});

export default db;
