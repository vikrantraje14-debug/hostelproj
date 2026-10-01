import { Router } from "express";
import { z } from "zod";
import { CONTENT_RESOURCES } from "../config/content-resources.js";
import validateRequest from "../middleware/validate-request.js";

export function createContentRoutes(contentService) {
  const router = Router();

  for (const resourceName of Object.keys(CONTENT_RESOURCES)) {
    if (resourceName === "settings") continue;
    router.get(`/${resourceName}`, async (request, response, next) => {
      try {
        const records = await contentService.listPublic(resourceName);
        response.setHeader("Cache-Control", "public, max-age=60");
        response.json({
          data: {
            resource: resourceName,
            records,
            isDemo: records.some((record) => record.is_demo),
          },
        });
      } catch (error) {
        next(error);
      }
    });

    router.get(
      `/${resourceName}/:id`,
      validateRequest({ params: z.object({ id: z.string().uuid() }) }),
      async (request, response, next) => {
        try {
          const record = await contentService.getPublic(
            resourceName,
            request.validated.params.id,
          );
          response.setHeader("Cache-Control", "public, max-age=60");
          response.json({ data: { record } });
        } catch (error) {
          next(error);
        }
      },
    );
  }

  router.get(
    "/content/pages/:slug",
    validateRequest({
      params: z.object({ slug: z.string().regex(/^[a-z0-9-]{1,80}$/) }),
    }),
    async (request, response, next) => {
      try {
        const result = await contentService.getPublicPage(
          request.validated.params.slug,
        );
        response.setHeader("Cache-Control", "public, max-age=60");
        response.json({
          data: {
            content: result?.page ?? null,
            isDemo: result?.isDemo ?? true,
          },
        });
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
