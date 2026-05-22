import { env } from "../env.js";

type Level = "debug" | "info" | "warn" | "error";
type Meta = Record<string, unknown>;

function log(level: Level, msg: string, meta?: Meta) {
  const entry = { ts: new Date().toISOString(), level, msg, ...meta };
  if (env.NODE_ENV === "development") {
    const tag = { debug: "DEBUG", info: "INFO ", warn: "WARN ", error: "ERROR" }[
      level
    ];
    console.log(`[${tag}] ${msg}`, meta ?? "");
  } else {
    console.log(JSON.stringify(entry));
  }
}

export const logger = {
  debug: (msg: string, meta?: Meta) => log("debug", msg, meta),
  info: (msg: string, meta?: Meta) => log("info", msg, meta),
  warn: (msg: string, meta?: Meta) => log("warn", msg, meta),
  error: (msg: string, meta?: Meta) => log("error", msg, meta),
};
