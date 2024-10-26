import { serve } from '@hono/node-server'

import app from "./app.js";
import env from "./env.js";

const port = env.PORT;
console.log(`Server is running on port http://localhost:${port}`)

serve({
  fetch: app.fetch,
  port
})
