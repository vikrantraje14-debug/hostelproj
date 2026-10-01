import { Router } from "express";
import healthRoutes from "./health.routes.js";
import { createAuthRoutes } from "./auth.routes.js";
import { createApplicationRoutes } from "./applications.routes.js";
import { createAdminRoutes } from "./admin.routes.js";
import { createStudentRoutes } from "./students.routes.js";
import { sessionCookieName } from "../controllers/auth.controller.js";
import { createContentRoutes } from "./content.routes.js";

export function createApiRouter({
  authService,
  applicationService,
  documentService,
  statusService,
  adminService,
  contentService,
}) {
  const router = Router();

  router.use(healthRoutes);
  router.use("/auth", createAuthRoutes(authService));
  router.use(
    "/students",
    createStudentRoutes(authService, sessionCookieName()),
  );
  router.use(createContentRoutes(contentService));
  router.use(
    "/applications",
    createApplicationRoutes(
      authService,
      applicationService,
      documentService,
      statusService,
    ),
  );
  router.use(
    "/admin",
    createAdminRoutes(authService, statusService, adminService, contentService),
  );

  return router;
}

export default createApiRouter;
