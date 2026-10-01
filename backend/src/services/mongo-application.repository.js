import { randomUUID } from "node:crypto";
import { getMongoDatabase } from "../config/database.js";
import { ApiError } from "../utils/api-error.js";

export function createMongoApplicationRepository({
  getDatabase = getMongoDatabase,
} = {}) {
  return {
    async createStudentApplication({
      studentUserId,
      referenceNumber,
      submittedAt,
      application,
    }) {
      const database = await getDatabase();
      let hostelPreferenceId = null;
      let hostelPreferenceSnapshot = application.hostelPreference;
      if (
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          application.hostelPreference,
        )
      ) {
        const hostel = await database.collection("hostels").findOne({
          _id: application.hostelPreference,
          is_active: true,
        });
        if (!hostel) {
          throw new ApiError(
            422,
            "INVALID_HOSTEL_PREFERENCE",
            "The selected hostel is not available.",
          );
        }
        hostelPreferenceId = hostel._id;
        hostelPreferenceSnapshot = hostel.name;
      }

      const record = {
        _id: randomUUID(),
        student_user_id: studentUserId,
        reference_number: referenceNumber,
        hostel_preference_id: hostelPreferenceId,
        hostel_preference_snapshot: hostelPreferenceSnapshot,
        status: "submitted",
        full_name: application.fullName,
        date_of_birth: application.dateOfBirth,
        gender: application.gender,
        mobile_number: application.mobileNumber,
        contact_email: application.email.trim().toLowerCase(),
        address: application.address,
        college: application.college,
        course: application.course,
        branch: application.branch,
        year_of_study: application.year,
        roll_number: application.rollNumber,
        student_number_snapshot: application.studentId,
        admission_year: application.admissionYear,
        guardian_name: application.guardianName,
        guardian_relationship: application.guardianRelationship,
        guardian_mobile: application.guardianMobile,
        guardian_address: application.guardianAddress,
        guardian_other_information: application.guardianOtherInfo || null,
        hostel_other_information: application.hostelOtherInfo || null,
        submitted_at: submittedAt,
        reviewed_at: null,
        created_at: submittedAt,
        updated_at: submittedAt,
        status_history: [
          {
            previous_status: null,
            new_status: "submitted",
            changed_by_user_id: studentUserId,
            reason: "Student submitted application",
            student_remarks: null,
            created_at: submittedAt,
          },
        ],
      };

      try {
        await database.collection("applications").insertOne(record);
      } catch (error) {
        if (error.code === 11000) {
          const duplicate = new Error("Duplicate application constraint.");
          duplicate.code = "23505";
          duplicate.constraint = error.keyPattern?.reference_number
            ? "applications_reference_number_unique"
            : "applications_one_active_per_student_year_idx";
          throw duplicate;
        }
        throw error;
      }

      return {
        id: record._id,
        referenceNumber: record.reference_number,
        status: record.status,
        submittedAt: record.submitted_at,
        admissionYear: record.admission_year,
        summary: {
          fullName: record.full_name,
          college: record.college,
          course: record.course,
          hostelPreference: record.hostel_preference_snapshot,
        },
      };
    },
  };
}
