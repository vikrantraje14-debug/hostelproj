import { randomBytes } from "node:crypto";
import { env } from "../config/env.js";
import { csrfCookieName, csrfCookieOptions } from "../middleware/csrf.js";
import { ApiError } from "../utils/api-error.js";

export function sessionCookieName() {
  return env.NODE_ENV === "production" ? "__Host-hostel.sid" : "hostel.sid";
}

function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 12 * 60 * 60 * 1000,
  };
}

function clearSessionCookie(response) {
  const { maxAge, ...options } = sessionCookieOptions();
  response.clearCookie(sessionCookieName(), options);
}

function setNoStore(response) {
  response.setHeader("Cache-Control", "no-store");
}

export function createAuthController(authService) {
  return {
    csrf(request, response) {
      const token = randomBytes(32).toString("base64url");
      response.cookie(csrfCookieName(), token, csrfCookieOptions());
      setNoStore(response);
      response.json({ data: { csrfToken: token } });
    },

    async registerStudent(request, response) {
      const session = await authService.registerStudent(
        request.validated.body,
        {
          userAgent: request.get("user-agent"),
          ipAddress: request.ip,
        },
      );
      response.cookie(
        sessionCookieName(),
        session.token,
        sessionCookieOptions(),
      );
      setNoStore(response);
      response.status(201).json({ data: { user: session.user } });
    },

    async studentLogin(request, response) {
      const session = await authService.login(
        { ...request.validated.body, role: "student" },
        { userAgent: request.get("user-agent"), ipAddress: request.ip },
      );
      response.cookie(
        sessionCookieName(),
        session.token,
        sessionCookieOptions(),
      );
      setNoStore(response);
      response.json({ data: { user: session.user } });
    },

    async adminLogin(request, response) {
      const session = await authService.login(
        { ...request.validated.body, role: "admin" },
        { userAgent: request.get("user-agent"), ipAddress: request.ip },
      );
      response.cookie(
        sessionCookieName(),
        session.token,
        sessionCookieOptions(),
      );
      setNoStore(response);
      response.json({ data: { user: session.user } });
    },

    async logout(request, response) {
      await authService.logout(request.cookies?.[sessionCookieName()]);
      clearSessionCookie(response);
      response.clearCookie(csrfCookieName(), csrfCookieOptions());
      setNoStore(response);
      response.status(204).end();
    },

    currentUser(request, response) {
      setNoStore(response);
      response.json({ data: { user: request.authUser } });
    },

    async studentProfile(request, response) {
      const profile = await authService.getStudentProfile(request.authUser.id);
      if (!profile) {
        throw new ApiError(
          404,
          "PROFILE_NOT_FOUND",
          "Student profile was not found.",
        );
      }
      setNoStore(response);
      response.json({
        data: {
          profile: {
            userId: profile.id,
            email: profile.email,
            role: "STUDENT",
            fullName: profile.full_name,
            studentNumber: profile.student_number,
          },
        },
      });
    },
  };
}
