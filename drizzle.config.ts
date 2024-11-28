import { defineConfig } from "drizzle-kit";

import env from "./src/lib/server/env";

export default defineConfig({
  out: "./src/lib/server/db/migrations",
  schema: "./src/lib/schema.ts",
  dialect: "sqlite",
  casing: "snake_case",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
});
