import { createDatabasePool } from "../config/database.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/api-error.js";

export function createPostgresAuthRepository({
  getPool = createDatabasePool,
} = {}) {
  let pool;
  const getConnectionPool = () => {
    if (!env.DATABASE_URL) {
      throw new ApiError(
        503,
        "DATABASE_NOT_CONFIGURED",
        "Authentication is temporarily unavailable.",
      );
    }
    return (pool ??= getPool());
  };

  return {
    async createStudent({ email, passwordHash, fullName }) {
      const client = await getConnectionPool().connect();
      try {
        await client.query("BEGIN");
        const userResult = await client.query(
          `INSERT INTO users (email, password_hash, role)
           VALUES ($1, $2, 'student')
           RETURNING id, email, role, account_status`,
          [email, passwordHash],
        );
        const user = userResult.rows[0];
        await client.query(
          "INSERT INTO students (user_id, full_name) VALUES ($1, $2)",
          [user.id, fullName],
        );
        await client.query("COMMIT");
        return { ...user, fullName, passwordHash };
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },

    async findUserByEmail(email) {
      const result = await getConnectionPool().query(
        `SELECT u.id, u.email, u.password_hash, u.role, u.account_status,
                s.full_name, a.display_name
         FROM users u
         LEFT JOIN students s ON s.user_id = u.id
         LEFT JOIN admins a ON a.user_id = u.id
         WHERE u.email = $1`,
        [email],
      );
      const row = result.rows[0];
      return row
        ? {
            id: row.id,
            email: row.email,
            passwordHash: row.password_hash,
            role: row.role,
            accountStatus: row.account_status,
            fullName: row.full_name,
            displayName: row.display_name,
          }
        : null;
    },

    async createSession({
      userId,
      tokenHash,
      expiresAt,
      userAgent,
      ipAddress,
    }) {
      const database = getConnectionPool();
      await database.query(
        "DELETE FROM user_sessions WHERE user_id = $1 AND expires_at <= now()",
        [userId],
      );
      await database.query(
        `INSERT INTO user_sessions (
          user_id, token_hash, expires_at, user_agent, ip_address
        ) VALUES ($1, $2, $3, $4, $5)`,
        [userId, tokenHash, expiresAt, userAgent, ipAddress],
      );
    },

    async findActiveSession(tokenHash) {
      const result = await getConnectionPool().query(
        `SELECT u.id, u.email, u.role, u.account_status,
                s.full_name, a.display_name
         FROM user_sessions session
         JOIN users u ON u.id = session.user_id
         LEFT JOIN students s ON s.user_id = u.id
         LEFT JOIN admins a ON a.user_id = u.id
         WHERE session.token_hash = $1
           AND session.revoked_at IS NULL
           AND session.expires_at > now()`,
        [tokenHash],
      );
      const row = result.rows[0];
      if (!row) return null;

      await getConnectionPool().query(
        "UPDATE user_sessions SET last_seen_at = now() WHERE token_hash = $1",
        [tokenHash],
      );
      return {
        id: row.id,
        email: row.email,
        role: row.role,
        accountStatus: row.account_status,
        fullName: row.full_name,
        displayName: row.display_name,
      };
    },

    async revokeSession(tokenHash) {
      await getConnectionPool().query(
        "UPDATE user_sessions SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL",
        [tokenHash],
      );
    },

    async getStudentProfile(userId) {
      const result = await getConnectionPool().query(
        `SELECT u.id, u.email, u.role, u.account_status,
                s.full_name, s.student_number
         FROM users u JOIN students s ON s.user_id = u.id
         WHERE u.id = $1`,
        [userId],
      );
      return result.rows[0] ?? null;
    },

    async listOwnApplications(userId) {
      const result = await getConnectionPool().query(
        `SELECT id, status, hostel_preference_id, admission_year,
                submitted_at, created_at, updated_at
         FROM applications WHERE student_user_id = $1
         ORDER BY created_at DESC`,
        [userId],
      );
      return result.rows;
    },

    async getOwnApplication(userId, applicationId) {
      const result = await getConnectionPool().query(
        `SELECT id, reference_number, status, hostel_preference_id,
          hostel_preference_snapshot, admission_year, submitted_at,
          reviewed_at, full_name, college, course, created_at, updated_at
         FROM applications
         WHERE id = $1 AND student_user_id = $2`,
        [applicationId, userId],
      );
      return result.rows[0] ?? null;
    },

    async listApplicationsForAdmin() {
      const result = await getConnectionPool().query(
        `SELECT id, student_user_id, status, hostel_preference_id,
                admission_year, submitted_at, created_at, updated_at
         FROM applications ORDER BY created_at DESC LIMIT 200`,
      );
      return result.rows;
    },
  };
}
