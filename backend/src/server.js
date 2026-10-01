import { env } from "./config/env.js";
import app from "./app.js";
import { log } from "./utils/logger.js";

const server = app.listen(env.PORT, () => {
  log("info", "API server listening", {
    port: env.PORT,
    environment: env.NODE_ENV,
    apiVersion: "v1",
  });
});

server.on("error", (error) => {
  log("error", "API server failed to start", {
    errorName: error.name,
  });
  process.exitCode = 1;
});
