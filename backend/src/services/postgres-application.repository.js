import { createDatabasePool } from "../config/database.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/api-error.js";

export function createPostgresApplicationRepository({
  getPool = createDatabasePool,
} = {}) {
  let pool;

  function getConnectionPool() {
    if (!env.DATABASE_URL) {
      throw new ApiError(
        503,
        "DATABASE_NOT_CONFIGURED",
        "Application submission is temporarily unavailable.",
      );
    }
    return (pool ??= getPool());
  }

  return {
    async createStudentApplication({
      studentUserId,
      referenceNumber,
      submittedAt,
      application,
    }) {
      const client = await getConnectionPool().connect();

      try {
        await client.query("BEGIN");
        let hostelPreferenceId = null;
        let hostelPreferenceSnapshot = application.hostelPreference;

        if (
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            application.hostelPreference,
          )
        ) {
          const hostel = await client.query(
            "SELECT id, name FROM hostels WHERE id = $1 AND is_active = true",
            [application.hostelPreference],
          );
          if (!hostel.rows[0]) {
            throw new ApiError(
              422,
              "INVALID_HOSTEL_PREFERENCE",
              "The selected hostel is not available.",
            );
          }
          hostelPreferenceId = hostel.rows[0].id;
          hostelPreferenceSnapshot = hostel.rows[0].name;
        }

        const result = await client.query(
          `INSERT INTO applications (
            student_user_id, reference_number, hostel_preference_id,
            hostel_preference_snapshot, status, full_name, date_of_birth,
            gender, mobile_number, contact_email, address, college, course,
            branch, year_of_study, roll_number, student_number_snapshot,
            admission_year, guardian_name, guardian_relationship,
            guardian_mobile, guardian_address, guardian_other_information,
            hostel_other_information, submitted_at
          ) VALUES (
            $1, $2, $3, $4, 'submitted', $5, $6, $7, $8, $9, $10, $11,
            $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
          )
          RETURNING id, reference_number, status, submitted_at, admission_year,
                    full_name, college, course, hostel_preference_snapshot`,
          [
            studentUserId,
            referenceNumber,
            hostelPreferenceId,
            hostelPreferenceSnapshot,
            application.fullName,
            application.dateOfBirth,
            application.gender,
            application.mobileNumber,
            application.email.trim().toLowerCase(),
            application.address,
            application.college,
            application.course,
            application.branch,
            application.year,
            application.rollNumber,
            application.studentId,
            application.admissionYear,
            application.guardianName,
            application.guardianRelationship,
            application.guardianMobile,
            application.guardianAddress,
            application.guardianOtherInfo || null,
            application.hostelOtherInfo || null,
            submittedAt,
          ],
        );
        const savedApplication = result.rows[0];

        await client.query(
          `INSERT INTO application_status_history (
            application_id, previous_status, new_status, changed_by_user_id,
            reason
          ) VALUES ($1, NULL, 'submitted', $2, 'Student submitted application')`,
          [savedApplication.id, studentUserId],
        );
        await client.query("COMMIT");

        return {
          id: savedApplication.id,
          referenceNumber: savedApplication.reference_number,
          status: savedApplication.status,
          submittedAt: savedApplication.submitted_at,
          admissionYear: savedApplication.admission_year,
          summary: {
            fullName: savedApplication.full_name,
            college: savedApplication.college,
            course: savedApplication.course,
            hostelPreference: savedApplication.hostel_preference_snapshot,
          },
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
