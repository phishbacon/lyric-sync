import { createRouter } from "@/lib/create-app";

import * as handlers from "./auth.handlers";
import * as routes from "./auth.routes";

const router = createRouter()
  .openapi(routes.getAll, handlers.getAll)
  .openapi(routes.insert, handlers.insert);

export default router;
