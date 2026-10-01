import { ApiError } from "../utils/api-error.js";

export default function validateRequest(schemas) {
  return function requestValidation(request, response, next) {
    const validated = {};

    for (const [part, schema] of Object.entries(schemas)) {
      const result = schema.safeParse(request[part]);

      if (!result.success) {
        const details = result.error.issues.map((issue) => ({
          field: issue.path.map(String).join("."),
          message: issue.message,
          code: issue.code,
        }));

        return next(
          new ApiError(
            400,
            "VALIDATION_ERROR",
            "Request validation failed.",
            details,
          ),
        );
      }

      validated[part] = result.data;
    }

    request.validated = validated;
    next();
  };
}
