import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { corsOptions } from "./config/cors.js";
import { env } from "./config/env.js";
import { createApiRouter } from "./routes/api.routes.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import requestLogger from "./middleware/request-logger.js";
import { createAuthService } from "./services/auth.service.js";
import { createMongoAuthRepository } from "./services/mongo-auth.repository.js";
import { createApplicationService } from "./services/application.service.js";
import { createMongoApplicationRepository } from "./services/mongo-application.repository.js";
import { createDocumentService } from "./services/document.service.js";
import { createMongoDocumentRepository } from "./services/mongo-document.repository.js";
import { createLocalDocumentStorage } from "./services/local-document-storage.js";
import { createApplicationStatusService } from "./services/application-status.service.js";
import { createMongoApplicationStatusRepository } from "./services/mongo-application-status.repository.js";
import { createAdminService } from "./services/admin.service.js";
import { createMongoAdminRepository } from "./services/mongo-admin.repository.js";
import { createContentService } from "./services/content.service.js";
import { createMongoContentRepository } from "./services/mongo-content.repository.js";

export function createApp({
  authService,
  applicationService,
  documentService,
  statusService,
  adminService,
  contentService,
} = {}) {
  const service =
    authService ??
    createAuthService({
      repository: createMongoAuthRepository(),
      sessionSecret: env.SESSION_SECRET,
    });
  const submissionService =
    applicationService ??
    createApplicationService({
      repository: createMongoApplicationRepository(),
    });
  const documents =
    documentService ??
    createDocumentService({
      repository: createMongoDocumentRepository(),
      storage: createLocalDocumentStorage({
        ...(env.DOCUMENT_STORAGE_PATH
          ? { rootDirectory: env.DOCUMENT_STORAGE_PATH }
          : {}),
      }),
    });
  const statuses =
    statusService ??
    createApplicationStatusService({
      repository: createMongoApplicationStatusRepository(),
    });
  const administrators =
    adminService ??
    createAdminService({ repository: createMongoAdminRepository() });
  const content =
    contentService ??
    createContentService({ repository: createMongoContentRepository() });
  const apiRouter = createApiRouter({
    authService: service,
    applicationService: submissionService,
    documentService: documents,
    statusService: statuses,
    adminService: administrators,
    contentService: content,
  });
  const app = express();

  app.disable("x-powered-by");
  app.use(requestLogger);
  app.use(helmet());
  app.use(cors(corsOptions));
  app.use(cookieParser());
  app.use(express.json({ limit: "1mb" }));
  app.use(
    "/api/",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 300,
      handler: (request, response) => {
        response.status(429).json({
          error: {
            code: "RATE_LIMITED",
            message: "Too many requests. Please try again later.",
            requestId: request.id,
          },
        });
      },
    }),
  );

  app.use("/api/v1", apiRouter);
  app.use("/api", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  app.locals.environment = env.NODE_ENV;
  return app;
}

const app = createApp();

export default app;
