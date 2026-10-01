import { createDatabasePool } from "../config/database.js";
import { env } from "../config/env.js";
import { isAllowedStatusTransition } from "../config/application-status.js";
import { ApiError } from "../utils/api-error.js";

export function createPostgresApplicationStatusRepository({
  getPool = createDatabasePool,
} = {}) {
  let pool;

  function getConnectionPool() {
    if (!env.DATABASE_URL) {
      throw new ApiError(
        503,
        "DATABASE_NOT_CONFIGURED",
        "Application status is temporarily unavailable.",
      );
    }
    return (pool ??= getPool());
  }

  return {
    async getStudentStatus(userId, applicationId) {
      const database = getConnectionPool();
      const applicationResult = await database.query(
        `SELECT id, reference_number, status, submitted_at, updated_at
         FROM applications
         WHERE id = $1 AND student_user_id = $2`,
        [applicationId, userId],
      );
      const application = applicationResult.rows[0];
      if (!application) return null;

      const historyResult = await database.query(
        `SELECT previous_status, new_status, student_remarks, created_at
         FROM application_status_history
         WHERE application_id = $1
         ORDER BY created_at ASC, id ASC`,
        [applicationId],
      );
      return { application, history: historyResult.rows };
    },

    async findOwnApplicationByReference(userId, referenceNumber) {
      const result = await getConnectionPool().query(
        `SELECT id, reference_number, status, submitted_at, updated_at
         FROM applications
         WHERE student_user_id = $1 AND reference_number = $2`,
        [userId, referenceNumber],
      );
      return result.rows[0] ?? null;
    },

    async transitionApplicationStatus({
      applicationId,
      adminUserId,
      status,
      studentRemarks,
    }) {
      const client = await getConnectionPool().connect();
      try {
        await client.query("BEGIN");
        const currentResult = await client.query(
          "SELECT status FROM applications WHERE id = $1 FOR UPDATE",
          [applicationId],
        );
        const previousStatus = currentResult.rows[0]?.status;
        if (!previousStatus) {
          throw new ApiError(404, "NOT_FOUND", "Application was not found.");
        }
        if (!isAllowedStatusTransition(previousStatus, status)) {
          throw new ApiError(
            409,
            "INVALID_STATUS_TRANSITION",
            "This application cannot move to the selected status.",
          );
        }

        const storageStatus = status.toLowerCase();
        await client.query(
          "SELECT set_config('app.status_changed_by_user_id', $1, true)",
          [adminUserId],
        );
        await client.query(
          "SELECT set_config('app.status_student_remarks', $1, true)",
          [studentRemarks ?? ""],
        );
        await client.query(
          `UPDATE applications
             SET status = $2, updated_at = now(),
               reviewed_at = COALESCE(reviewed_at, now())
           WHERE id = $1`,
          [applicationId, storageStatus],
        );
        await client.query("COMMIT");
        return {
          applicationId,
          previousStatus: previousStatus.toUpperCase(),
          status,
        };
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        throw error;
      } finally {
        client.release();
      }
    },
  };
}
