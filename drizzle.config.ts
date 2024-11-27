import { defineConfig } from "drizzle-kit";

import env from "./src/env";

export default defineConfig({
  out: "./src/lib/server/db/migrations",
  schema: "./src/lib/server/db/schema.ts",
  dialect: "sqlite",
  casing: "snake_case",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
});
