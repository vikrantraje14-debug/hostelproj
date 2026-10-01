import { Router } from "express";
import { createAuthController } from "../controllers/auth.controller.js";
import {
  requireAuthentication,
  requireRole,
} from "../middleware/authentication.js";

export function createStudentRoutes(authService, sessionCookieName) {
  const router = Router();
  const requireAuth = requireAuthentication(authService, sessionCookieName);
  const controller = createAuthController(authService);

  router.get(
    "/me",
    requireAuth,
    requireRole("STUDENT"),
    controller.studentProfile,
  );
  return router;
}
