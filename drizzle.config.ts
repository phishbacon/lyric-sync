import { defineConfig } from "drizzle-kit";
import { env } from "./src/lib/server/env";

export default defineConfig({
  dialect: "sqlite",
  casing: "snake_case",
  schema: "./src/lib/server/db/schema.ts",
  out: "./src/lib/server/db/migrations",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
});
