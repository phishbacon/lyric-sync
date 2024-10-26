import { OpenAPIHono } from "@hono/zod-openapi";
import { pinoLogger } from "hono-pino";

import defaultHook from "@/openapi/default-hook.js";
import notFound from "@/middlewares/not-found.js";
import onError from "@/middlewares/on-error.js";
import serveEmojiFavicon from "@/middlewares/serve-emoji-favicon.js";

import type { AppBindings } from "./types.js";

export function createRouter() {
  return new OpenAPIHono<AppBindings>({
    strict: false,
    defaultHook,
  });
}

export default function createApp() {
  const app = createRouter();
  app.use(serveEmojiFavicon("🎵"));
  app.use(pinoLogger());

  app.notFound(notFound);
  app.onError(onError);

  return app;
};
