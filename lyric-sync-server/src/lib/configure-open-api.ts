import type { AppOpenAPI } from "./types.js";
import packageJSON from "../../package.json";
import { apiReference } from "@scalar/hono-api-reference";

export default function configureOpenAPI(app: AppOpenAPI) {
  // The OpenAPI documentation will be available at /doc
  app.doc("/doc", {
    openapi: "3.0.0",
    info: {
      version: packageJSON.version,
      title: "lyric-sync API",
    },
  });

  app.get("/reference",
    apiReference({
      defaultHttpClient: {
        targetKey: "javascript",
        clientKey: "fetch"
      },
      spec: {
        url: "/doc",
      },
    }),
  );
}