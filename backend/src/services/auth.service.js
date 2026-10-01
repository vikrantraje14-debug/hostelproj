import { createHmac, randomBytes } from "node:crypto";
import argon2 from "argon2";
import { ApiError } from "../utils/api-error.js";

const passwordOptions = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

const sessionLifetimeMs = 12 * 60 * 60 * 1000;
const dummyPasswordHash = await argon2.hash(
  randomBytes(32).toString("base64url"),
  passwordOptions,
);

function safeUser(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role.toUpperCase(),
    ...(user.fullName ? { fullName: user.fullName } : {}),
    ...(user.displayName ? { displayName: user.displayName } : {}),
  };
}

export function createAuthService({
  repository,
  sessionSecret,
  now = () => new Date(),
}) {
  function assertConfigured() {
    if (
      !repository ||
      typeof sessionSecret !== "string" ||
      sessionSecret.length < 32
    ) {
      throw new ApiError(
        503,
        "AUTH_NOT_CONFIGURED",
        "Authentication is temporarily unavailable.",
      );
    }
  }

  function digestSessionToken(token) {
    return createHmac("sha256", sessionSecret).update(token).digest("hex");
  }

  async function createSession(user, context = {}) {
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(now().getTime() + sessionLifetimeMs);

    await repository.createSession({
      userId: user.id,
      tokenHash: digestSessionToken(token),
      expiresAt,
      userAgent: context.userAgent ?? null,
      ipAddress: context.ipAddress ?? null,
    });

    return { token, expiresAt, user: safeUser(user) };
  }

  return {
    async registerStudent({ email, password, fullName }, context) {
      assertConfigured();
      const normalizedEmail = email.trim().toLowerCase();
      const passwordHash = await argon2.hash(password, passwordOptions);
      let user;

      try {
        user = await repository.createStudent({
          email: normalizedEmail,
          passwordHash,
          fullName: fullName.trim(),
        });
      } catch (error) {
        if (error.code === "23505" || error.code === 11000) {
          throw new ApiError(
            409,
            "REGISTRATION_UNAVAILABLE",
            "Unable to register with those details.",
          );
        }
        throw error;
      }

      return createSession(user, context);
    },

    async login({ email, password, role }, context) {
      assertConfigured();
      const user = await repository.findUserByEmail(email.trim().toLowerCase());
      let passwordMatches = false;
      const storedPasswordHash = user?.passwordHash;
      const hashToVerify =
        typeof storedPasswordHash === "string" &&
        storedPasswordHash.startsWith("$argon2id$")
          ? storedPasswordHash
          : dummyPasswordHash;

      try {
        passwordMatches = await argon2.verify(hashToVerify, password);
      } catch {
        await argon2.verify(dummyPasswordHash, password).catch(() => false);
        passwordMatches = false;
      }

      if (
        !passwordMatches ||
        user.role !== role ||
        user.accountStatus !== "active"
      ) {
        throw new ApiError(
          401,
          "INVALID_CREDENTIALS",
          "Email or password is incorrect.",
        );
      }

      return createSession(user, context);
    },

    async authenticate(token) {
      assertConfigured();
      if (!token) {
        throw new ApiError(401, "UNAUTHENTICATED", "Sign in is required.");
      }

      const session = await repository.findActiveSession(
        digestSessionToken(token),
      );
      if (!session || session.accountStatus !== "active") {
        throw new ApiError(401, "UNAUTHENTICATED", "Sign in is required.");
      }

      return safeUser(session);
    },

    async logout(token) {
      assertConfigured();
      if (!token) return;
      await repository.revokeSession(digestSessionToken(token));
    },

    async getStudentProfile(userId) {
      assertConfigured();
      return repository.getStudentProfile(userId);
    },

    async listOwnApplications(userId) {
      assertConfigured();
      return repository.listOwnApplications(userId);
    },

    async getOwnApplication(userId, applicationId) {
      assertConfigured();
      const application = await repository.getOwnApplication(
        userId,
        applicationId,
      );
      if (!application) return null;
      return {
        id: application.id,
        referenceNumber:
          application.referenceNumber ?? application.reference_number,
        status: application.status,
        submittedAt: application.submittedAt ?? application.submitted_at,
        updatedAt: application.updatedAt ?? application.updated_at,
        admissionYear: application.admissionYear ?? application.admission_year,
        summary: application.summary ?? {
          fullName: application.full_name,
          college: application.college,
          course: application.course,
          hostelPreference:
            application.hostel_preference_snapshot ??
            application.hostel_preference_id ??
            null,
        },
      };
    },

    async listApplicationsForAdmin() {
      assertConfigured();
      return repository.listApplicationsForAdmin();
    },

    async getSessionCookieTokenHash(token) {
      assertConfigured();
      return digestSessionToken(token);
    },
  };
}
