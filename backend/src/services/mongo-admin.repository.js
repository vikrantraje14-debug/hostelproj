import { getMongoDatabase } from "../config/database.js";
import { ApiError } from "../utils/api-error.js";

function safeRegex(value) {
  return new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
}

function pageResult(rows, page, pageSize, total) {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
    rows,
  };
}

export function createMongoAdminRepository({
  getDatabase = getMongoDatabase,
} = {}) {
  return {
    async getDashboardStats() {
      const database = await getDatabase();
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      const [
        totalApplications,
        pendingApplications,
        underReview,
        approved,
        rejected,
        receivedToday,
      ] = await Promise.all([
        database.collection("applications").countDocuments({}),
        database
          .collection("applications")
          .countDocuments({
            status: {
              $in: [
                "draft",
                "submitted",
                "document_verification",
                "additional_information_required",
              ],
            },
          }),
        database
          .collection("applications")
          .countDocuments({ status: "under_review" }),
        database
          .collection("applications")
          .countDocuments({ status: "approved" }),
        database
          .collection("applications")
          .countDocuments({ status: "rejected" }),
        database
          .collection("applications")
          .countDocuments({ submitted_at: { $gte: start, $lt: end } }),
      ]);
      return {
        totalApplications,
        pendingApplications,
        underReview,
        approved,
        rejected,
        receivedToday,
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
      const database = await getDatabase();
      const filter = {};
      if (status) filter.status = status.toLowerCase();
      if (admissionYear) filter.admission_year = admissionYear;
      if (search) {
        const regex = safeRegex(search);
        filter.$or = [
          { reference_number: regex },
          { full_name: regex },
          { college: regex },
          { course: regex },
        ];
      }
      const sortFields = {
        applicationNumber: "reference_number",
        studentName: "full_name",
        college: "college",
        course: "course",
        hostel: "hostel_preference_snapshot",
        submissionDate: "submitted_at",
        status: "status",
      };
      const sort = {
        [sortFields[sortBy] ?? "submitted_at"]:
          sortDirection === "asc" ? 1 : -1,
      };
      const collection = database.collection("applications");
      const [rawRows, total] = await Promise.all([
        collection
          .find(filter)
          .sort(sort)
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .toArray(),
        collection.countDocuments(filter),
      ]);
      const rows = await Promise.all(
        rawRows.map(async (application) => {
          const user = await database
            .collection("users")
            .findOne({ _id: application.student_user_id });
          const hostel = application.hostel_preference_id
            ? await database
                .collection("hostels")
                .findOne({ _id: application.hostel_preference_id })
            : null;
          return {
            id: application._id,
            applicationNumber: application.reference_number,
            studentName:
              application.full_name ?? user?.student_profile?.full_name,
            college: application.college,
            course: application.course,
            hostel:
              application.hostel_preference_snapshot ??
              hostel?.name ??
              "Not specified",
            submissionDate: application.submitted_at,
            status: application.status.toUpperCase(),
            admissionYear: application.admission_year,
          };
        }),
      );
      return {
        applications: rows,
        ...pageResult([], page, pageSize, total),
        rows: undefined,
      };
    },

    async getApplicationDetails(applicationId) {
      const database = await getDatabase();
      const application = await database
        .collection("applications")
        .findOne({ _id: applicationId });
      if (!application) return null;
      const [user, hostel, documents] = await Promise.all([
        database
          .collection("users")
          .findOne({ _id: application.student_user_id }),
        application.hostel_preference_id
          ? database
              .collection("hostels")
              .findOne({ _id: application.hostel_preference_id })
          : null,
        database
          .collection("application_documents")
          .find({ application_id: applicationId })
          .sort({ created_at: -1 })
          .toArray(),
      ]);
      return {
        id: application._id,
        applicationNumber: application.reference_number,
        status: application.status.toUpperCase(),
        submittedAt: application.submitted_at,
        updatedAt: application.updated_at,
        admissionYear: application.admission_year,
        student: {
          fullName: application.full_name,
          email: user?.email,
          studentNumber:
            user?.student_profile?.student_number ??
            application.student_number_snapshot,
          dateOfBirth: application.date_of_birth,
          gender: application.gender,
          mobileNumber: application.mobile_number,
          address: application.address,
        },
        academic: {
          college: application.college,
          course: application.course,
          branch: application.branch,
          year: application.year_of_study,
          rollNumber: application.roll_number,
        },
        guardian: {
          name: application.guardian_name,
          relationship: application.guardian_relationship,
          mobile: application.guardian_mobile,
          address: application.guardian_address,
          remarks: application.guardian_other_information,
        },
        hostel:
          application.hostel_preference_snapshot ??
          hostel?.name ??
          "Not specified",
        hostelRemarks: application.hostel_other_information,
        history: (application.status_history ?? []).map((entry) => ({
          previousStatus: entry.previous_status?.toUpperCase() ?? null,
          status: entry.new_status.toUpperCase(),
          remarks: entry.student_remarks ?? null,
          timestamp: entry.created_at,
        })),
        documents: documents.map((document) => ({
          id: document._id,
          applicationId: document.application_id,
          documentType: document.document_type,
          originalFilename: document.original_filename,
          contentType: document.content_type,
          byteSize: document.byte_size,
          createdAt: document.created_at,
        })),
      };
    },

    async listStudents({ page, pageSize, search }) {
      const database = await getDatabase();
      const filter = { role: "student" };
      if (search) {
        const regex = safeRegex(search);
        filter.$or = [
          { email: regex },
          { "student_profile.full_name": regex },
          { "student_profile.student_number": regex },
        ];
      }
      const users = database.collection("users");
      const [rows, total] = await Promise.all([
        users
          .find(filter)
          .sort({ "student_profile.full_name": 1 })
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .toArray(),
        users.countDocuments(filter),
      ]);
      const students = await Promise.all(
        rows.map(async (user) => ({
          id: user._id,
          fullName: user.student_profile?.full_name,
          email: user.email,
          studentNumber: user.student_profile?.student_number ?? null,
          applicationCount: await database
            .collection("applications")
            .countDocuments({ student_user_id: user._id }),
          createdAt: user.created_at,
        })),
      );
      return {
        students,
        ...pageResult([], page, pageSize, total),
        rows: undefined,
      };
    },

    async listDocuments({ page, pageSize, search }) {
      const database = await getDatabase();
      const filter = {};
      if (search) {
        const regex = safeRegex(search);
        filter.$or = [
          { original_filename: regex },
          { application_number: regex },
          { student_name: regex },
        ];
      }
      const collection = database.collection("application_documents");
      const [documents, total] = await Promise.all([
        collection
          .find(filter)
          .sort({ created_at: -1 })
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .toArray(),
        collection.countDocuments(filter),
      ]);
      const rows = await Promise.all(
        documents.map(async (document) => {
          const application = await database
            .collection("applications")
            .findOne({ _id: document.application_id });
          return {
            id: document._id,
            applicationId: document.application_id,
            applicationNumber: application?.reference_number,
            studentName: application?.full_name,
            documentType: document.document_type,
            originalFilename: document.original_filename,
            contentType: document.content_type,
            byteSize: document.byte_size,
            createdAt: document.created_at,
          };
        }),
      );
      return {
        documents: rows,
        ...pageResult([], page, pageSize, total),
        rows: undefined,
      };
    },
  };
}
