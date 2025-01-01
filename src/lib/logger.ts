import { browser } from "$app/environment";
import pino, { type Logger, type LoggerOptions } from "pino";
import { get, readable, type Readable } from "svelte/store";

const pinoLogger: Logger = await (async () => {
  let pinoOptions: LoggerOptions;
  // eslint-disable-next-line ts/typedef
  let destinationStream;

  if (browser) {
    pinoOptions = {
      browser: { asObject: false },
      level: "info",
    };
  }
  else {
    // eslint-disable-next-line ts/typedef
    const env = await import("./server/env");
    // eslint-disable-next-line ts/typedef
    const pretty = await import("pino-pretty");

    pinoOptions = {
      level: env.default.LOG_LEVEL || "info",
    };
    destinationStream = env.default.NODE_ENV === "production" ? undefined : pretty.PinoPretty();
  }
  return pino(
    pinoOptions,
    destinationStream,
  );
})();

const readableLogger: Readable<Logger> = readable<Logger>(pinoLogger);

export const logger: Logger = get(readableLogger);
