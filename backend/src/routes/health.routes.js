import { Router } from "express";

const router = Router();

router.get("/health", (request, response) => {
  response.status(200).json({
    data: { status: "ok" },
    meta: { apiVersion: "v1" },
  });
});

export default router;
