import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { createAuthController } from "../controllers/auth.controller.js";
import { sessionCookieName } from "../controllers/auth.controller.js";
import { requireAuthentication } from "../middleware/authentication.js";
import { requireCsrf } from "../middleware/csrf.js";
import { placeholderController } from "../controllers/placeholder.controller.js";
import validateRequest from "../middleware/validate-request.js";

const credentialsSchema = z
  .object({
    email: z.string().trim().email().max(254),
    password: z.string().min(12).max(128),
  })
  .strict();

const registrationSchema = z
  .object({
    email: z.string().trim().email().max(254),
    password: z.string().min(12).max(128),
    fullName: z.string().trim().min(2).max(120),
  })
  .strict();

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "AUTH_RATE_LIMITED",
      message: "Too many authentication attempts. Please try again later.",
    },
  },
});

export function createAuthRoutes(authService) {
  const router = Router();
  const controller = createAuthController(authService);
  const requireAuth = requireAuthentication(authService, sessionCookieName());

  router.get("/", placeholderController("auth"));
  router.get("/csrf", controller.csrf);
  router.post(
    "/register",
    authRateLimit,
    requireCsrf,
    validateRequest({ body: registrationSchema }),
    controller.registerStudent,
  );
  router.post(
    "/login",
    authRateLimit,
    requireCsrf,
    validateRequest({ body: credentialsSchema }),
    controller.studentLogin,
  );
  router.post(
    "/admin/login",
    authRateLimit,
    requireCsrf,
    validateRequest({ body: credentialsSchema }),
    controller.adminLogin,
  );
  router.post("/logout", requireCsrf, controller.logout);
  router.get("/me", requireAuth, controller.currentUser);

  return router;
}

export default createAuthRoutes;
