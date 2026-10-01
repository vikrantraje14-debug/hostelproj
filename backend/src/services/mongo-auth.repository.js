import { randomUUID } from "node:crypto";
import { getMongoDatabase } from "../config/database.js";

function userProjection(user) {
  if (!user) return null;
  return {
    id: user._id,
    email: user.email,
    passwordHash: user.password_hash,
    role: user.role,
    accountStatus: user.account_status,
    fullName: user.student_profile?.full_name,
    displayName: user.admin_profile?.display_name,
  };
}

function applicationProjection(application) {
  return {
    id: application._id,
    reference_number: application.reference_number,
    status: application.status,
    hostel_preference_id: application.hostel_preference_id,
    hostel_preference_snapshot: application.hostel_preference_snapshot,
    admission_year: application.admission_year,
    submitted_at: application.submitted_at,
    reviewed_at: application.reviewed_at,
    full_name: application.full_name,
    college: application.college,
    course: application.course,
    created_at: application.created_at,
    updated_at: application.updated_at,
  };
}

export function createMongoAuthRepository({
  getDatabase = getMongoDatabase,
} = {}) {
  return {
    async createStudent({ email, passwordHash, fullName }) {
      const database = await getDatabase();
      const user = {
        _id: randomUUID(),
        email,
        password_hash: passwordHash,
        role: "student",
        account_status: "active",
        student_profile: { full_name: fullName, student_number: null },
        created_at: new Date(),
        updated_at: new Date(),
      };
      await database.collection("users").insertOne(user);
      return userProjection(user);
    },

    async findUserByEmail(email) {
      return userProjection(
        await (await getDatabase()).collection("users").findOne({ email }),
      );
    },

    async createSession(session) {
      const database = await getDatabase();
      const sessions = database.collection("user_sessions");
      await sessions.deleteMany({
        user_id: session.userId,
        expires_at: { $lte: new Date() },
      });
      await sessions.insertOne({
        _id: session.tokenHash,
        user_id: session.userId,
        expires_at: session.expiresAt,
        user_agent: session.userAgent,
        ip_address: session.ipAddress,
        revoked_at: null,
        created_at: new Date(),
        last_seen_at: new Date(),
      });
    },

    async findActiveSession(tokenHash) {
      const database = await getDatabase();
      const sessions = database.collection("user_sessions");
      const session = await sessions.findOne({
        _id: tokenHash,
        revoked_at: null,
        expires_at: { $gt: new Date() },
      });
      if (!session) return null;
      const user = await database.collection("users").findOne({
        _id: session.user_id,
      });
      if (!user) return null;
      await sessions.updateOne(
        { _id: tokenHash },
        { $set: { last_seen_at: new Date() } },
      );
      return userProjection(user);
    },

    async revokeSession(tokenHash) {
      await (await getDatabase())
        .collection("user_sessions")
        .updateOne(
          { _id: tokenHash, revoked_at: null },
          { $set: { revoked_at: new Date() } },
        );
    },

    async getStudentProfile(userId) {
      const user = await (await getDatabase()).collection("users").findOne({
        _id: userId,
        role: "student",
      });
      if (!user) return null;
      return {
        id: user._id,
        email: user.email,
        role: user.role,
        account_status: user.account_status,
        full_name: user.student_profile?.full_name,
        student_number: user.student_profile?.student_number ?? null,
      };
    },

    async listOwnApplications(userId) {
      const result = await (await getDatabase())
        .collection("applications")
        .find({ student_user_id: userId })
        .sort({ created_at: -1 })
        .toArray();
      return result.map((application) => ({
        id: application._id,
        status: application.status,
        hostel_preference_id: application.hostel_preference_id,
        admission_year: application.admission_year,
        submitted_at: application.submitted_at,
        created_at: application.created_at,
        updated_at: application.updated_at,
      }));
    },

    async getOwnApplication(userId, applicationId) {
      const application = await (await getDatabase())
        .collection("applications")
        .findOne({ _id: applicationId, student_user_id: userId });
      return application ? applicationProjection(application) : null;
    },

    async listApplicationsForAdmin() {
      const applications = await (await getDatabase())
        .collection("applications")
        .find({})
        .sort({ created_at: -1 })
        .limit(200)
        .toArray();
      return applications.map(applicationProjection);
    },
  };
}
