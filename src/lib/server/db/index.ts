import { drizzle } from "drizzle-orm/libsql";

import env from "../../../env";
import * as schema from "./schema";

const db = drizzle({
  connection: env.DATABASE_URL,
  casing: "snake_case",
  schema,
});

export default db;
