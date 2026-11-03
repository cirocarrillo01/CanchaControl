// backend/src/routes/report.routes.js
import express from "express";
import * as r from "../controllers/report.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";

const router = express.Router();
router.use(protect, authorize("administrador", "dueno"));

router.get("/reports/income", r.income);
router.get("/reports/usage", r.usage);
router.get("/reports/status", r.status);
router.get("/reports/methods", r.methods);

export default router;
