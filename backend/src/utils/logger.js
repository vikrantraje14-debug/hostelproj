import { env } from "../config/env.js";

const levels = ["debug", "info", "warn", "error"];

export function log(level, message, metadata = {}) {
  if (levels.indexOf(level) < levels.indexOf(env.LOG_LEVEL)) return;

  const entry = {
    ...metadata,
    timestamp: new Date().toISOString(),
    level,
    message,
  };
  const output = `${JSON.stringify(entry)}\n`;

  if (level === "error" || level === "warn") {
    process.stderr.write(output);
    return;
  }

  process.stdout.write(output);
}
