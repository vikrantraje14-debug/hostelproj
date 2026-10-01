import { Router } from "express";
import { placeholderController } from "../controllers/placeholder.controller.js";

const router = Router();
router.get("/", placeholderController("fees"));

export default router;
