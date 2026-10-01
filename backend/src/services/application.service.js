import { randomBytes } from "node:crypto";
import { ApiError } from "../utils/api-error.js";

function createReferenceNumber(now) {
  return `GHA-${now.getUTCFullYear()}-${randomBytes(8).toString("hex").toUpperCase()}`;
}

export function createApplicationService({
  repository,
  now = () => new Date(),
}) {
  return {
    async submitStudentApplication(studentUserId, input) {
      const timestamp = now();

      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          return await repository.createStudentApplication({
            studentUserId,
            referenceNumber: createReferenceNumber(timestamp),
            submittedAt: timestamp,
            application: input,
          });
        } catch (error) {
          if (
            error.code === "23505" &&
            error.constraint === "applications_one_active_per_student_year_idx"
          ) {
            throw new ApiError(
              409,
              "DUPLICATE_APPLICATION",
              "An active application already exists for this admission year.",
            );
          }
          if (
            error.code === "23505" &&
            error.constraint === "applications_reference_number_unique" &&
            attempt < 2
          ) {
            continue;
          }
          throw error;
        }
      }

      throw new ApiError(
        503,
        "REFERENCE_GENERATION_FAILED",
        "Application submission is temporarily unavailable.",
      );
    },
  };
}
