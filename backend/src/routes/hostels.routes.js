import { Router } from "express";
import { z } from "zod";
import { placeholderController } from "../controllers/placeholder.controller.js";
import validateRequest from "../middleware/validate-request.js";

const router = Router();
router.get("/", placeholderController("hostels"));
router.get(
  "/:id",
  validateRequest({
    params: z.object({ id: z.string().trim().min(1).max(80) }),
  }),
  placeholderController("hostels"),
);

export default router;
