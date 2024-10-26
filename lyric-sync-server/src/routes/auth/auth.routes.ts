import { createRoute, z } from "@hono/zod-openapi";

import { insertUsersSchema, selectUsersSchema } from "@/db/schema";
import * as StatusCodes from "@/http-status-codes";
import jsonContent from "@/openapi/helpers/json-content";
import jsonContentRequired from "@/openapi/helpers/json-content-required";
import createErrorSchema from "@/openapi/schemas/create-error-schema";

const tags = ["Users"];

export const getAll = createRoute({
  path: "/auth/users",
  method: "get",
  tags,
  responses: {
    [StatusCodes.OK]: jsonContent(
      z.array(selectUsersSchema),
      "List of all users",
    ),
  },
});

export const insert = createRoute({
  path: "/auth/users",
  method: "post",
  request: {
    body: jsonContentRequired(
      insertUsersSchema,
      "The user to be inserted",
    ),
  },
  tags,
  responses: {
    [StatusCodes.OK]: jsonContent(
      selectUsersSchema,
      "The inserted user",
    ),
    [StatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(insertUsersSchema),
      "The validation error(s)",
    ),
  },
});

export type GetAllRoute = typeof getAll;
export type InsertRoute = typeof insert;
