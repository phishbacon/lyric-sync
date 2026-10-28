import process from "node:process";
import { z } from "zod";

try {
  process.loadEnvFile();
}
catch {
  // No .env file present — rely on real environment variables.
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().default("file:lyric-sync.db"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", z.treeifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
