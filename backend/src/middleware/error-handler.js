import { log } from "../utils/logger.js";
import { ApiError } from "../utils/api-error.js";

export function notFoundHandler(request, response, next) {
  next(new ApiError(404, "NOT_FOUND", "The requested resource was not found."));
}

export function errorHandler(error, request, response, next) {
  if (response.headersSent) {
    next(error);
    return;
  }

  const isMalformedJson =
    error instanceof SyntaxError && Object.hasOwn(error, "body");
  const statusCode = isMalformedJson
    ? 400
    : error instanceof ApiError
      ? error.statusCode
      : 500;
  const code = isMalformedJson
    ? "INVALID_JSON"
    : error instanceof ApiError
      ? error.code
      : "INTERNAL_SERVER_ERROR";
  const message = isMalformedJson
    ? "Request body contains invalid JSON."
    : error instanceof ApiError
      ? error.message
      : "An unexpected error occurred.";

  if (statusCode >= 500) {
    log("error", "Request failed", {
      requestId: request.id,
      method: request.method,
      path: request.path,
      errorName: error.name,
    });
  }

  response.status(statusCode).json({
    error: {
      code,
      message,
      requestId: request.id,
      ...(error instanceof ApiError && error.details
        ? { details: error.details }
        : {}),
    },
  });
}
