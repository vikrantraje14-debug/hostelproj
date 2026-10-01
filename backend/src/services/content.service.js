import { CONTENT_RESOURCES } from "../config/content-resources.js";
import { ApiError } from "../utils/api-error.js";

function assertResource(resourceName) {
  if (!CONTENT_RESOURCES[resourceName]) {
    throw new ApiError(
      404,
      "CONTENT_NOT_FOUND",
      "Content resource was not found.",
    );
  }
  return CONTENT_RESOURCES[resourceName];
}

function normalizeDatabaseErrors(error) {
  if (error.code === "23505") {
    throw new ApiError(
      409,
      "CONTENT_CONFLICT",
      "A record with those unique values already exists.",
    );
  }
  if (
    error.code === "23503" ||
    error.code === "23514" ||
    error.code === "22007"
  ) {
    throw new ApiError(
      400,
      "INVALID_CONTENT",
      "The content conflicts with a database constraint.",
    );
  }
  throw error;
}

function safeValidationDetails(issues) {
  return issues.map((issue) => ({
    field: issue.path.map(String).join("."),
    message: issue.message,
    code: issue.code,
  }));
}

export function createContentService({ repository }) {
  return {
    async listAdmin(resourceName, options) {
      assertResource(resourceName);
      return repository.listAdmin(resourceName, options);
    },

    async getAdmin(resourceName, id) {
      assertResource(resourceName);
      const record = await repository.getAdmin(resourceName, id);
      if (!record)
        throw new ApiError(404, "NOT_FOUND", "Content record was not found.");
      return record;
    },

    async create(resourceName, input, context) {
      const definition = assertResource(resourceName);
      const parsed = definition.schema.safeParse(input);
      if (!parsed.success) {
        throw new ApiError(
          400,
          "VALIDATION_ERROR",
          "Content fields are invalid.",
          safeValidationDetails(parsed.error.issues),
        );
      }
      try {
        return await repository.create(resourceName, parsed.data, context);
      } catch (error) {
        normalizeDatabaseErrors(error);
      }
    },

    async update(resourceName, id, input, context) {
      const definition = assertResource(resourceName);
      const parsed = definition.schema.safeParse(input);
      if (!parsed.success) {
        throw new ApiError(
          400,
          "VALIDATION_ERROR",
          "Content fields are invalid.",
          safeValidationDetails(parsed.error.issues),
        );
      }
      try {
        return await repository.update(resourceName, id, parsed.data, context);
      } catch (error) {
        normalizeDatabaseErrors(error);
      }
    },

    async delete(resourceName, id, context) {
      assertResource(resourceName);
      try {
        return await repository.delete(resourceName, id, context);
      } catch (error) {
        normalizeDatabaseErrors(error);
      }
    },

    async listPublic(resourceName) {
      assertResource(resourceName);
      return repository.listPublic(resourceName);
    },

    async getPublic(resourceName, id) {
      assertResource(resourceName);
      const record = await repository.getPublic(resourceName, id);
      if (!record) {
        throw new ApiError(404, "NOT_FOUND", "Content record was not found.");
      }
      return record;
    },

    async getPublicPage(slug) {
      if (!/^[a-z0-9-]{1,80}$/.test(slug)) {
        throw new ApiError(404, "NOT_FOUND", "Page content was not found.");
      }
      return repository.getPublicPage(slug);
    },
  };
}
