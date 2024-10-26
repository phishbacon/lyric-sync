import type { NotFoundHandler } from "hono";

import { NOT_FOUND } from "@/http-status-codes.js";
import { NOT_FOUND as NOT_FOUND_REASON } from "@/http-status-reasons.js";

const notFound: NotFoundHandler = (c) => {
  return c.json({
    message: `${NOT_FOUND_REASON} - ${c.req.path}`,
  }, NOT_FOUND)
};

export default notFound;