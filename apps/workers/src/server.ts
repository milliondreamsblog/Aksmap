import express from "express";
import { serve } from "inngest/express";
import { env } from "./env.js";
import { inngest } from "./inngest/client.js";
import { functions } from "./inngest/functions.js";
import { logger } from "./lib/logger.js";

const app = express();

app.use(express.json({ limit: "1mb" }));

app.use(
  "/api/inngest",
  serve({
    client: inngest,
    functions,
    signingKey: env.INNGEST_SIGNING_KEY,
  }),
);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", ts: new Date().toISOString() });
});

app.get("/", (_req, res) => {
  res.json({
    name: "job-hunter workers",
    functions: functions.map((f) => f.id()),
  });
});

const port = env.PORT;
app.listen(port, () => {
  logger.info(`Workers server listening on :${port}`, {
    functions: functions.map((f) => f.id()),
  });
});
