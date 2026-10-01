import { Router } from "express";
import { z } from "zod";
import { requireCsrf } from "../middleware/csrf.js";
import {
  requireAuthentication,
  requireRole,
} from "../middleware/authentication.js";
import validateRequest from "../middleware/validate-request.js";
import { sessionCookieName } from "../controllers/auth.controller.js";
import multer from "multer";
import { MAX_DOCUMENT_SIZE } from "../config/documents.js";
import { ApiError } from "../utils/api-error.js";
import rateLimit from "express-rate-limit";

const documentUploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "UPLOAD_RATE_LIMITED",
      message: "Too many document uploads. Please try again later.",
    },
  },
});

const parseDocumentUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_DOCUMENT_SIZE,
    files: 1,
    fields: 1,
    fieldSize: 100,
    parts: 2,
  },
}).single("document");

function handleDocumentUpload(request, response, next) {
  parseDocumentUpload(request, response, (error) => {
    if (!error) return next();
    if (error.code === "LIMIT_FILE_SIZE") {
      return next(
        new ApiError(
          413,
          "DOCUMENT_TOO_LARGE",
          "The document exceeds the 10 MB limit.",
        ),
      );
    }
    return next(
      new ApiError(400, "INVALID_UPLOAD", "The document upload is malformed."),
    );
  });
}

const dateOfBirthSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    );
  }, "Enter a valid date.")
  .refine(
    (value) => value <= new Date().toISOString().slice(0, 10),
    "Date of birth cannot be in the future.",
  );

const applicationSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120),
    dateOfBirth: dateOfBirthSchema,
    gender: z.string().trim().min(1).max(80),
    mobileNumber: z
      .string()
      .trim()
      .regex(/^[+()\-\s\d]{7,20}$/),
    email: z.string().trim().email().max(254),
    address: z.string().trim().min(3).max(1000),
    college: z.string().trim().min(2).max(200),
    course: z.string().trim().min(1).max(160),
    branch: z.string().trim().min(1).max(160),
    year: z.coerce.number().int().min(1).max(20),
    rollNumber: z.string().trim().min(1).max(100),
    studentId: z.string().trim().min(1).max(100),
    admissionYear: z.coerce.number().int().min(1900).max(2200),
    guardianName: z.string().trim().min(2).max(120),
    guardianRelationship: z.string().trim().min(1).max(80),
    guardianMobile: z
      .string()
      .trim()
      .regex(/^[+()\-\s\d]{7,20}$/),
    guardianAddress: z.string().trim().min(3).max(1000),
    guardianOtherInfo: z.string().trim().max(2000).optional(),
    hostelPreference: z.string().trim().min(1).max(160),
    hostelOtherInfo: z.string().trim().max(2000).optional(),
  })
  .strict();

export function createApplicationRoutes(
  authService,
  applicationService,
  documentService,
  statusService,
) {
  const router = Router();
  const requireAuth = requireAuthentication(authService, sessionCookieName());

  router.post(
    "/",
    requireAuth,
    requireRole("STUDENT"),
    requireCsrf,
    validateRequest({ body: applicationSchema }),
    async (request, response, next) => {
      try {
        const application = await applicationService.submitStudentApplication(
          request.authUser.id,
          request.validated.body,
        );
        response.setHeader("Cache-Control", "no-store");
        response.status(201).json({ data: { application } });
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/search",
    requireAuth,
    requireRole("STUDENT"),
    validateRequest({
      query: z.object({
        referenceNumber: z.string().trim().min(1).max(64),
      }),
    }),
    async (request, response, next) => {
      try {
        const application = await statusService.searchOwnApplication(
          request.authUser.id,
          request.validated.query.referenceNumber,
        );
        response.setHeader("Cache-Control", "no-store");
        response.json({ data: { application } });
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/:id/status",
    requireAuth,
    requireRole("STUDENT"),
    validateRequest({ params: z.object({ id: z.string().uuid() }) }),
    async (request, response, next) => {
      try {
        const status = await statusService.getStudentStatus(
          request.authUser.id,
          request.validated.params.id,
        );
        response.setHeader("Cache-Control", "no-store");
        response.json({ data: { status } });
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/",
    requireAuth,
    requireRole("STUDENT"),
    async (request, response, next) => {
      try {
        const applications = await authService.listOwnApplications(
          request.authUser.id,
        );
        response.setHeader("Cache-Control", "no-store");
        response.json({ data: { applications } });
      } catch (error) {
        next(error);
      }
    },
  );
  router.get(
    "/mine",
    requireAuth,
    requireRole("STUDENT"),
    async (request, response, next) => {
      try {
        const applications = await authService.listOwnApplications(
          request.authUser.id,
        );
        response.setHeader("Cache-Control", "no-store");
        response.json({ data: { applications } });
      } catch (error) {
        next(error);
      }
    },
  );
  router.get(
    "/:id/documents",
    requireAuth,
    requireRole("STUDENT", "ADMIN"),
    validateRequest({ params: z.object({ id: z.string().uuid() }) }),
    async (request, response, next) => {
      try {
        const result = await documentService.listApplicationDocuments({
          applicationId: request.validated.params.id,
          userId: request.authUser.id,
          isAdmin: request.authUser.role === "ADMIN",
        });
        response.setHeader("Cache-Control", "no-store");
        response.json({ data: result });
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/:id/documents",
    requireAuth,
    requireRole("STUDENT"),
    requireCsrf,
    documentUploadRateLimit,
    validateRequest({ params: z.object({ id: z.string().uuid() }) }),
    handleDocumentUpload,
    async (request, response, next) => {
      try {
        const document = await documentService.uploadDocument({
          applicationId: request.validated.params.id,
          userId: request.authUser.id,
          file: request.file,
          documentType: request.body.documentType,
        });
        response.setHeader("Cache-Control", "no-store");
        response.status(201).json({ data: { document } });
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/:id/documents/:documentId/content",
    requireAuth,
    requireRole("STUDENT", "ADMIN"),
    validateRequest({
      params: z.object({
        id: z.string().uuid(),
        documentId: z.string().uuid(),
      }),
    }),
    async (request, response, next) => {
      try {
        const { document, content } = await documentService.getDocumentContent({
          applicationId: request.validated.params.id,
          documentId: request.validated.params.documentId,
          userId: request.authUser.id,
          isAdmin: request.authUser.role === "ADMIN",
        });
        response.setHeader("Cache-Control", "no-store");
        response.setHeader("X-Content-Type-Options", "nosniff");
        response.setHeader("Content-Security-Policy", "sandbox");
        response.setHeader(
          "Content-Disposition",
          `attachment; filename="document-${document.id}.${document.content_type === "application/pdf" ? "pdf" : document.content_type === "image/png" ? "png" : "jpg"}"`,
        );
        response.type(document.content_type).send(content);
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    "/:id",
    requireAuth,
    requireRole("STUDENT"),
    validateRequest({ params: z.object({ id: z.string().uuid() }) }),
    async (request, response, next) => {
      try {
        const application = await authService.getOwnApplication(
          request.authUser.id,
          request.validated.params.id,
        );
        if (!application) {
          response.status(404).json({
            error: { code: "NOT_FOUND", message: "Application was not found." },
          });
          return;
        }
        response.setHeader("Cache-Control", "no-store");
        response.json({ data: { application } });
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
