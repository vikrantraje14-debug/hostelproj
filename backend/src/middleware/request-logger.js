import { randomUUID } from "node:crypto";
import { log } from "../utils/logger.js";

export default function requestLogger(request, response, next) {
  const startedAt = performance.now();
  request.id = randomUUID();
  response.setHeader("X-Request-Id", request.id);

  response.on("finish", () => {
    log("info", "HTTP request", {
      requestId: request.id,
      method: request.method,
      path: request.path,
      statusCode: response.statusCode,
      durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
    });
  });

  next();
}
