import { APPLICATION_STATUSES } from "../config/application-status.js";
import { ApiError } from "../utils/api-error.js";

function publicHistoryEntry(entry) {
  return {
    previousStatus: entry.previous_status
      ? entry.previous_status.toUpperCase()
      : null,
    status: entry.new_status.toUpperCase(),
    timestamp: entry.created_at,
    remarks: entry.student_remarks ?? null,
  };
}

export function createApplicationStatusService({ repository }) {
  return {
    async getStudentStatus(userId, applicationId) {
      const result = await repository.getStudentStatus(userId, applicationId);
      if (!result) {
        throw new ApiError(404, "NOT_FOUND", "Application was not found.");
      }
      const history = result.history.map(publicHistoryEntry);
      return {
        applicationId: result.application.id,
        referenceNumber: result.application.reference_number,
        status: result.application.status.toUpperCase(),
        submittedAt: result.application.submitted_at,
        updatedAt: result.application.updated_at,
        remarks:
          [...history].reverse().find((entry) => entry.remarks)?.remarks ??
          null,
        history,
      };
    },

    async searchOwnApplication(userId, referenceNumber) {
      const application = await repository.findOwnApplicationByReference(
        userId,
        referenceNumber.trim(),
      );
      if (!application) {
        throw new ApiError(404, "NOT_FOUND", "Application was not found.");
      }
      return {
        id: application.id,
        referenceNumber: application.reference_number,
        status: application.status.toUpperCase(),
        submittedAt: application.submitted_at,
        updatedAt: application.updated_at,
      };
    },

    async transitionApplicationStatus({
      applicationId,
      adminUserId,
      status,
      remarks,
    }) {
      if (!APPLICATION_STATUSES.includes(status)) {
        throw new ApiError(
          400,
          "INVALID_STATUS",
          "Choose a valid application status.",
        );
      }
      return repository.transitionApplicationStatus({
        applicationId,
        adminUserId,
        status,
        studentRemarks: remarks?.trim() || null,
      });
    },
  };
}
