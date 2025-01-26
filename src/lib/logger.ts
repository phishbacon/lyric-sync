import { browser } from "$app/environment";
import pino, { type Logger, type LoggerOptions } from "pino";
import { get, readable, type Readable } from "svelte/store";

const pinoLogger: Logger & {
  setLogLevel?: (level: pino.LevelWithSilentOrString) => pino.LevelWithSilentOrString;
} = await (async () => {
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
    const pretty = await import("pino-pretty");

    pinoOptions = {
      level: "info",
    };
    destinationStream = pretty.PinoPretty();
  }
  return pino(
    pinoOptions,
    destinationStream,
  );
})();

pinoLogger.setLogLevel = (level: pino.LevelWithSilentOrString) => {
  let logLevel: LoggerOptions["level"] = "info";
  logLevel = level;
  // eslint-disable-next-line ts/no-use-before-define
  logger.info(`Setting log level to ${logLevel}`);
  pinoLogger.level = logLevel;
  return logLevel;
};

const readableLogger: Readable<Logger> = readable<Logger>(pinoLogger);

export const logger: Logger = get(readableLogger);
