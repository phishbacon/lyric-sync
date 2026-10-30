import pino from "pino";

export const logger = pino({
  // Tunables read before/independently of env validation (logger must work
  // even when env.ts aborts the process).
  // eslint-disable-next-line node/no-process-env
  level: process.env.LOG_LEVEL ?? "info",
  // eslint-disable-next-line node/no-process-env
  transport: process.env.NODE_ENV === "development"
    ? { target: "pino-pretty" }
    : undefined,
});
