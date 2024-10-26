import { OpenAPIHono } from "@hono/zod-openapi";
import { pinoLogger } from "hono-pino";

import notFound from "@/middlewares/not-found";
import onError from "@/middlewares/on-error";
import serveEmojiFavicon from "@/middlewares/serve-emoji-favicon";
import defaultHook from "@/openapi/default-hook";

import type { AppBindings } from "./types";

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
