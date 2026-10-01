import { Router } from "express";
import { placeholderController } from "../controllers/placeholder.controller.js";
import {
  requireAuthentication,
  requireRole,
} from "../middleware/authentication.js";
import { sessionCookieName } from "../controllers/auth.controller.js";
import { requireCsrf } from "../middleware/csrf.js";
import validateRequest from "../middleware/validate-request.js";
import { z } from "zod";
import { CONTENT_RESOURCE_NAMES } from "../config/content-resources.js";

const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(120).optional(),
});

const applicationQuerySchema = pageQuerySchema.extend({
  status: z
    .enum([
      "SUBMITTED",
      "UNDER_REVIEW",
      "DOCUMENT_VERIFICATION",
      "APPROVED",
      "REJECTED",
      "ADDITIONAL_INFORMATION_REQUIRED",
    ])
    .optional(),
  admissionYear: z.coerce.number().int().min(1900).max(2200).optional(),
  sortBy: z
    .enum([
      "applicationNumber",
      "studentName",
      "college",
      "course",
      "hostel",
      "submissionDate",
      "status",
    ])
    .default("submissionDate"),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
});

export function createAdminRoutes(
  authService,
  statusService,
  adminService,
  contentService,
) {
  const router = Router();
  const requireAuth = requireAuthentication(authService, sessionCookieName());

  router.get("/", requireAuth, requireRole("ADMIN"), (request, response) => {
    response.setHeader("Cache-Control", "no-store");
    response.json({ data: { user: request.authUser } });
  });
  router.get(
    "/applications",
    requireAuth,
    requireRole("ADMIN"),
    validateRequest({ query: applicationQuerySchema }),
    async (request, response, next) => {
      try {
        const result = await adminService.listApplications(
          request.validated.query,
        );
        response.setHeader("Cache-Control", "no-store");
        response.json({ data: result });
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/stats",
    requireAuth,
    requireRole("ADMIN"),
    async (request, response, next) => {
      try {
        const stats = await adminService.getDashboardStats();
        response.setHeader("Cache-Control", "no-store");
        response.json({ data: { stats } });
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/applications/:id",
    requireAuth,
    requireRole("ADMIN"),
    validateRequest({ params: z.object({ id: z.string().uuid() }) }),
    async (request, response, next) => {
      try {
        const application = await adminService.getApplicationDetails(
          request.validated.params.id,
        );
        response.setHeader("Cache-Control", "no-store");
        response.json({ data: { application } });
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/students",
    requireAuth,
    requireRole("ADMIN"),
    validateRequest({ query: pageQuerySchema }),
    async (request, response, next) => {
      try {
        const result = await adminService.listStudents(request.validated.query);
        response.setHeader("Cache-Control", "no-store");
        response.json({ data: result });
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/documents",
    requireAuth,
    requireRole("ADMIN"),
    validateRequest({ query: pageQuerySchema }),
    async (request, response, next) => {
      try {
        const result = await adminService.listDocuments(
          request.validated.query,
        );
        response.setHeader("Cache-Control", "no-store");
        response.json({ data: result });
      } catch (error) {
        next(error);
      }
    },
  );

  router.patch(
    "/applications/:id/status",
    requireAuth,
    requireRole("ADMIN"),
    requireCsrf,
    validateRequest({
      params: z.object({ id: z.string().uuid() }),
      body: z
        .object({
          status: z.enum([
            "SUBMITTED",
            "UNDER_REVIEW",
            "DOCUMENT_VERIFICATION",
            "APPROVED",
            "REJECTED",
            "ADDITIONAL_INFORMATION_REQUIRED",
          ]),
          remarks: z.string().trim().max(1000).optional(),
        })
        .strict(),
    }),
    async (request, response, next) => {
      try {
        const result = await statusService.transitionApplicationStatus({
          applicationId: request.validated.params.id,
          adminUserId: request.authUser.id,
          ...request.validated.body,
        });
        response.setHeader("Cache-Control", "no-store");
        response.json({ data: { status: result } });
      } catch (error) {
        next(error);
      }
    },
  );

  const contentParamsSchema = z.object({
    resource: z.enum(CONTENT_RESOURCE_NAMES),
  });
  const contentRecordParamsSchema = contentParamsSchema.extend({
    id: z.string().uuid(),
  });

  router.get(
    "/content/:resource",
    requireAuth,
    requireRole("ADMIN"),
    validateRequest({
      params: contentParamsSchema,
      query: pageQuerySchema,
    }),
    async (request, response, next) => {
      try {
        const result = await contentService.listAdmin(
          request.validated.params.resource,
          request.validated.query,
        );
        response.setHeader("Cache-Control", "no-store");
        response.json({ data: result });
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/content/:resource/:id",
    requireAuth,
    requireRole("ADMIN"),
    validateRequest({ params: contentRecordParamsSchema }),
    async (request, response, next) => {
      try {
        const record = await contentService.getAdmin(
          request.validated.params.resource,
          request.validated.params.id,
        );
        response.setHeader("Cache-Control", "no-store");
        response.json({ data: { record } });
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/content/:resource",
    requireAuth,
    requireRole("ADMIN"),
    requireCsrf,
    validateRequest({
      params: contentParamsSchema,
      body: z.record(z.string(), z.unknown()),
    }),
    async (request, response, next) => {
      try {
        const record = await contentService.create(
          request.validated.params.resource,
          request.validated.body,
          {
            actorUserId: request.authUser.id,
            requestId: request.id,
            ipAddress: request.ip,
          },
        );
        response.setHeader("Cache-Control", "no-store");
        response.status(201).json({ data: { record } });
      } catch (error) {
        next(error);
      }
    },
  );

  router.put(
    "/content/:resource/:id",
    requireAuth,
    requireRole("ADMIN"),
    requireCsrf,
    validateRequest({
      params: contentRecordParamsSchema,
      body: z.record(z.string(), z.unknown()),
    }),
    async (request, response, next) => {
      try {
        const record = await contentService.update(
          request.validated.params.resource,
          request.validated.params.id,
          request.validated.body,
          {
            actorUserId: request.authUser.id,
            requestId: request.id,
            ipAddress: request.ip,
          },
        );
        response.setHeader("Cache-Control", "no-store");
        response.json({ data: { record } });
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete(
    "/content/:resource/:id",
    requireAuth,
    requireRole("ADMIN"),
    requireCsrf,
    validateRequest({ params: contentRecordParamsSchema }),
    async (request, response, next) => {
      try {
        const result = await contentService.delete(
          request.validated.params.resource,
          request.validated.params.id,
          {
            actorUserId: request.authUser.id,
            requestId: request.id,
            ipAddress: request.ip,
          },
        );
        response.setHeader("Cache-Control", "no-store");
        response.json({ data: result });
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
