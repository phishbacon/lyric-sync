import { createRoute } from "@hono/zod-openapi";

import * as StatusCodes from "@/http-status-codes";
import { createRouter } from "@/lib/create-app";
import jsonContent from "@/openapi/helpers/json-content";
import createMessageObjectSchema from "@/openapi/schemas/create-message-object";

const tags = ["Index"];

const router = createRouter()
  .openapi(createRoute({
    method: "get",
    path: "/",
    tags,
    responses: {
      [StatusCodes.OK]: jsonContent(
        createMessageObjectSchema("lyric-sync API"),
        "lyric-sync API Index",
      ),
    },
  }), (c) => {
    return c.json({
      message: "lyric-sync API",
    }, StatusCodes.OK);
  });

export default router;
