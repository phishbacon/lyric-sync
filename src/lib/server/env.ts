/* eslint-disable node/no-process-env */

import { config } from "dotenv";
import { expand } from "dotenv-expand";
import path from "node:path";
import { z } from "zod";

expand(config({
  path: path.resolve(
    process.cwd(),
    ".env",
  ),
}));

// eslint-disable-next-line ts/typedef
const EnvSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().default(9999),
  DATABASE_URL: z.string().url(),
  NO_PLEX: z.coerce.boolean().optional().default(false),
}).superRefine((input, ctx) => {
  if (input.NODE_ENV === "production") {
    if (!input.DATABASE_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.invalid_type,
        expected: "string",
        received: "undefined",
        path: ["DATABASE_URL"],
        message: "Must be set when NODE_ENV is 'production'",
      });
    }
  }
  else if (!input.DATABASE_URL) {
    input.DATABASE_URL = "file:dev.db";
  }
});

type env = z.infer<typeof EnvSchema>;

// eslint-disable-next-line ts/no-redeclare
const { data: env, error } = EnvSchema.safeParse(process.env);

if (error) {
  console.error("❌ Invalid env:");
  console.error(JSON.stringify(error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

export default env!;
