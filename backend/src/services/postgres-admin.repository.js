import { createDatabasePool } from "../config/database.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/api-error.js";

const sortColumns = Object.freeze({
  applicationNumber: "a.reference_number",
  studentName: "s.full_name",
  college: "a.college",
  course: "a.course",
  hostel: "COALESCE(a.hostel_preference_snapshot, h.name, '')",
  submissionDate: "a.submitted_at",
  status: "a.status",
});

function escapeLike(value) {
  return value.replace(/[!%_]/g, "!$&");
}

export function createPostgresAdminRepository({
  getPool = createDatabasePool,
} = {}) {
  let pool;

  function getConnectionPool() {
    if (!env.DATABASE_URL) {
      throw new ApiError(
        503,
        "DATABASE_NOT_CONFIGURED",
        "Administrative data is temporarily unavailable.",
      );
    }
    return (pool ??= getPool());
  }

  return {
    async getDashboardStats() {
      const result = await getConnectionPool().query(
        `SELECT
           count(*)::int AS total_applications,
           count(*) FILTER (WHERE status IN (
             'draft', 'submitted', 'document_verification',
             'additional_information_required'
           ))::int AS pending_applications,
           count(*) FILTER (WHERE status = 'under_review')::int AS under_review,
           count(*) FILTER (WHERE status = 'approved')::int AS approved,
           count(*) FILTER (WHERE status = 'rejected')::int AS rejected,
           count(*) FILTER (
             WHERE submitted_at >= CURRENT_DATE
               AND submitted_at < CURRENT_DATE + INTERVAL '1 day'
           )::int AS received_today
         FROM applications`,
      );
      const row = result.rows[0];
      return {
        totalApplications: row.total_applications,
        pendingApplications: row.pending_applications,
        underReview: row.under_review,
        approved: row.approved,
        rejected: row.rejected,
        receivedToday: row.received_today,
      };
    },

    async listApplications({
      page,
      pageSize,
      search,
      status,
      admissionYear,
      sortBy,
      sortDirection,
    }) {
      const values = [];
      const conditions = [];
      if (search) {
        values.push(`%${escapeLike(search)}%`);
        conditions.push(
          `(a.reference_number ILIKE $${values.length} ESCAPE '!'
            OR s.full_name ILIKE $${values.length} ESCAPE '!'
            OR a.college ILIKE $${values.length} ESCAPE '!'
            OR a.course ILIKE $${values.length} ESCAPE '!')`,
        );
      }
      if (status) {
        values.push(status.toLowerCase());
        conditions.push(`a.status = $${values.length}`);
      }
      if (admissionYear) {
        values.push(admissionYear);
        conditions.push(`a.admission_year = $${values.length}`);
      }
      const where = conditions.length
        ? `WHERE ${conditions.join(" AND ")}`
        : "";
      const orderBy = sortColumns[sortBy] ?? sortColumns.submissionDate;
      const direction = sortDirection === "asc" ? "ASC" : "DESC";
      const countResult = await getConnectionPool().query(
        `SELECT count(*)::int AS total
         FROM applications a
         JOIN students s ON s.user_id = a.student_user_id
         ${where}`,
        values,
      );
      const total = countResult.rows[0].total;
      const offset = (page - 1) * pageSize;
      const resultValues = [...values, pageSize, offset];
      const result = await getConnectionPool().query(
        `SELECT a.id, a.reference_number, s.full_name AS student_name,
                a.college, a.course,
                COALESCE(a.hostel_preference_snapshot, h.name, 'Not specified') AS hostel,
                a.submitted_at, a.status, a.admission_year
         FROM applications a
         JOIN students s ON s.user_id = a.student_user_id
         LEFT JOIN hostels h ON h.id = a.hostel_preference_id
         ${where}
         ORDER BY ${orderBy} ${direction} NULLS LAST, a.id ASC
         LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        resultValues,
      );
      return {
        applications: result.rows.map((row) => ({
          id: row.id,
          applicationNumber: row.reference_number,
          studentName: row.student_name,
          college: row.college,
          course: row.course,
          hostel: row.hostel,
          submissionDate: row.submitted_at,
          status: row.status.toUpperCase(),
          admissionYear: row.admission_year,
        })),
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      };
    },

    async getApplicationDetails(applicationId) {
      const database = getConnectionPool();
      const result = await database.query(
        `SELECT a.id, a.reference_number, a.status, a.submitted_at, a.updated_at,
                a.admission_year, a.full_name, a.date_of_birth, a.gender,
                a.mobile_number, a.contact_email, a.address, a.college,
                a.course, a.branch, a.year_of_study, a.roll_number,
                a.student_number_snapshot, a.guardian_name,
                a.guardian_relationship, a.guardian_mobile, a.guardian_address,
                a.guardian_other_information, a.hostel_other_information,
                COALESCE(a.hostel_preference_snapshot, h.name, 'Not specified') AS hostel,
                u.email AS account_email, s.student_number
         FROM applications a
         JOIN students s ON s.user_id = a.student_user_id
         JOIN users u ON u.id = a.student_user_id
         LEFT JOIN hostels h ON h.id = a.hostel_preference_id
         WHERE a.id = $1`,
        [applicationId],
      );
      const row = result.rows[0];
      if (!row) return null;
      const [history, documents] = await Promise.all([
        database.query(
          `SELECT previous_status, new_status, student_remarks, created_at
           FROM application_status_history
           WHERE application_id = $1
           ORDER BY created_at ASC, id ASC`,
          [applicationId],
        ),
        database.query(
          `SELECT id, application_id, document_type, original_filename,
                  content_type, byte_size, created_at
           FROM application_documents
           WHERE application_id = $1
           ORDER BY created_at DESC, id`,
          [applicationId],
        ),
      ]);
      return {
        id: row.id,
        applicationNumber: row.reference_number,
        status: row.status.toUpperCase(),
        submittedAt: row.submitted_at,
        updatedAt: row.updated_at,
        admissionYear: row.admission_year,
        student: {
          fullName: row.full_name,
          email: row.account_email,
          studentNumber: row.student_number ?? row.student_number_snapshot,
          dateOfBirth: row.date_of_birth,
          gender: row.gender,
          mobileNumber: row.mobile_number,
          address: row.address,
        },
        academic: {
          college: row.college,
          course: row.course,
          branch: row.branch,
          year: row.year_of_study,
          rollNumber: row.roll_number,
        },
        guardian: {
          name: row.guardian_name,
          relationship: row.guardian_relationship,
          mobile: row.guardian_mobile,
          address: row.guardian_address,
          remarks: row.guardian_other_information,
        },
        hostel: row.hostel,
        hostelRemarks: row.hostel_other_information,
        history: history.rows.map((entry) => ({
          previousStatus: entry.previous_status?.toUpperCase() ?? null,
          status: entry.new_status.toUpperCase(),
          remarks: entry.student_remarks,
          timestamp: entry.created_at,
        })),
        documents: documents.rows.map((document) => ({
          id: document.id,
          applicationId: document.application_id,
          documentType: document.document_type,
          originalFilename: document.original_filename,
          contentType: document.content_type,
          byteSize: Number(document.byte_size),
          createdAt: document.created_at,
        })),
      };
    },

    async listStudents({ page, pageSize, search }) {
      const values = [];
      const conditions = [];
      if (search) {
        values.push(`%${escapeLike(search)}%`);
        conditions.push(
          `(s.full_name ILIKE $1 ESCAPE '!' OR u.email ILIKE $1 ESCAPE '!' OR s.student_number ILIKE $1 ESCAPE '!')`,
        );
      }
      const where = conditions.length
        ? `WHERE ${conditions.join(" AND ")}`
        : "";
      const database = getConnectionPool();
      const countResult = await database.query(
        `SELECT count(*)::int AS total
         FROM students s JOIN users u ON u.id = s.user_id ${where}`,
        values,
      );
      const total = countResult.rows[0].total;
      const result = await database.query(
        `SELECT s.user_id AS id, s.full_name, u.email, s.student_number,
                s.created_at,
                count(a.id)::int AS application_count
         FROM students s
         JOIN users u ON u.id = s.user_id
         LEFT JOIN applications a ON a.student_user_id = s.user_id
         ${where}
         GROUP BY s.user_id, s.full_name, u.email, s.student_number, s.created_at
         ORDER BY s.full_name ASC, s.user_id
         LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        [...values, pageSize, (page - 1) * pageSize],
      );
      return {
        students: result.rows.map((row) => ({
          id: row.id,
          fullName: row.full_name,
          email: row.email,
          studentNumber: row.student_number,
          applicationCount: row.application_count,
          createdAt: row.created_at,
        })),
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      };
    },

    async listDocuments({ page, pageSize, search }) {
      const values = [];
      const conditions = [];
      if (search) {
        values.push(`%${escapeLike(search)}%`);
        conditions.push(
          `(d.original_filename ILIKE $1 ESCAPE '!' OR a.reference_number ILIKE $1 ESCAPE '!' OR s.full_name ILIKE $1 ESCAPE '!')`,
        );
      }
      const where = conditions.length
        ? `WHERE ${conditions.join(" AND ")}`
        : "";
      const database = getConnectionPool();
      const countResult = await database.query(
        `SELECT count(*)::int AS total
         FROM application_documents d
         JOIN applications a ON a.id = d.application_id
         JOIN students s ON s.user_id = a.student_user_id
         ${where}`,
        values,
      );
      const total = countResult.rows[0].total;
      const result = await database.query(
        `SELECT d.id, d.application_id, d.document_type, d.original_filename,
                d.content_type, d.byte_size, d.created_at,
                a.reference_number, s.full_name AS student_name
         FROM application_documents d
         JOIN applications a ON a.id = d.application_id
         JOIN students s ON s.user_id = a.student_user_id
         ${where}
         ORDER BY d.created_at DESC, d.id
         LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        [...values, pageSize, (page - 1) * pageSize],
      );
      return {
        documents: result.rows.map((row) => ({
          id: row.id,
          applicationId: row.application_id,
          applicationNumber: row.reference_number,
          studentName: row.student_name,
          documentType: row.document_type,
          originalFilename: row.original_filename,
          contentType: row.content_type,
          byteSize: Number(row.byte_size),
          createdAt: row.created_at,
        })),
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      };
    },
  };
}
