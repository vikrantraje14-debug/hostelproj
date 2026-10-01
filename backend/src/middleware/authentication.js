import { ApiError } from "../utils/api-error.js";

export function requireAuthentication(authService, sessionCookieName) {
  return async function authenticateRequest(request, response, next) {
    try {
      const token = request.cookies?.[sessionCookieName];
      request.authUser = await authService.authenticate(token);
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireRole(...roles) {
  return function authorizeRole(request, response, next) {
    if (!request.authUser) {
      next(new ApiError(401, "UNAUTHENTICATED", "Sign in is required."));
      return;
    }
    if (!roles.includes(request.authUser.role)) {
      next(
        new ApiError(
          403,
          "FORBIDDEN",
          "You are not allowed to access this resource.",
        ),
      );
      return;
    }
    next();
  };
}
