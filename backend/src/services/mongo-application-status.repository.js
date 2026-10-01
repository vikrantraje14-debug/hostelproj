import { getMongoDatabase } from "../config/database.js";
import { isAllowedStatusTransition } from "../config/application-status.js";
import { ApiError } from "../utils/api-error.js";

const statusHistory = (entry) => ({
  previous_status: entry.previous_status ?? null,
  new_status: entry.new_status,
  student_remarks: entry.student_remarks ?? null,
  created_at: entry.created_at,
});

export function createMongoApplicationStatusRepository({
  getDatabase = getMongoDatabase,
} = {}) {
  return {
    async getStudentStatus(userId, applicationId) {
      const application = await (await getDatabase())
        .collection("applications")
        .findOne({ _id: applicationId, student_user_id: userId });
      if (!application) return null;
      return {
        application: {
          id: application._id,
          reference_number: application.reference_number,
          status: application.status,
          submitted_at: application.submitted_at,
          updated_at: application.updated_at,
        },
        history: (application.status_history ?? []).map(statusHistory),
      };
    },

    async findOwnApplicationByReference(userId, referenceNumber) {
      const application = await (await getDatabase())
        .collection("applications")
        .findOne({
          student_user_id: userId,
          reference_number: referenceNumber,
        });
      if (!application) return null;
      return {
        id: application._id,
        reference_number: application.reference_number,
        status: application.status,
        submitted_at: application.submitted_at,
        updated_at: application.updated_at,
      };
    },

    async transitionApplicationStatus({
      applicationId,
      adminUserId,
      status,
      studentRemarks,
    }) {
      const collection = (await getDatabase()).collection("applications");
      const current = await collection.findOne({ _id: applicationId });
      if (!current) {
        throw new ApiError(404, "NOT_FOUND", "Application was not found.");
      }
      const previousStatus = current.status;
      if (!isAllowedStatusTransition(previousStatus, status)) {
        throw new ApiError(
          409,
          "INVALID_STATUS_TRANSITION",
          "This application cannot move to the selected status.",
        );
      }
      const timestamp = new Date();
      const result = await collection.updateOne(
        { _id: applicationId, status: previousStatus },
        {
          $set: {
            status: status.toLowerCase(),
            updated_at: timestamp,
            reviewed_at: current.reviewed_at ?? timestamp,
          },
          $push: {
            status_history: {
              previous_status: previousStatus,
              new_status: status.toLowerCase(),
              changed_by_user_id: adminUserId,
              student_remarks: studentRemarks,
              created_at: timestamp,
            },
          },
        },
      );
      if (result.matchedCount !== 1) {
        throw new ApiError(
          409,
          "STATUS_CHANGED",
          "Application status changed concurrently. Refresh and try again.",
        );
      }
      return {
        applicationId,
        previousStatus: previousStatus.toUpperCase(),
        status,
      };
    },
  };
}
