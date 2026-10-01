import { timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";
import { ApiError } from "../utils/api-error.js";

export function csrfCookieName() {
  return env.NODE_ENV === "production" ? "__Host-hostel.csrf" : "hostel.csrf";
}

export function csrfCookieOptions() {
  return {
    httpOnly: false,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  };
}

export function requireCsrf(request, response, next) {
  const cookieToken = request.cookies?.[csrfCookieName()];
  const headerToken = request.get("X-CSRF-Token");
  const origin = request.get("Origin");

  if (
    (origin && origin !== env.CLIENT_ORIGIN) ||
    typeof cookieToken !== "string" ||
    typeof headerToken !== "string"
  ) {
    next(new ApiError(403, "CSRF_REJECTED", "Request could not be verified."));
    return;
  }

  const cookieBuffer = Buffer.from(cookieToken);
  const headerBuffer = Buffer.from(headerToken);
  if (
    cookieBuffer.length !== headerBuffer.length ||
    !timingSafeEqual(cookieBuffer, headerBuffer)
  ) {
    next(new ApiError(403, "CSRF_REJECTED", "Request could not be verified."));
    return;
  }

  next();
}
