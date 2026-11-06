// backend/src/routes/report.routes.js
import express from "express";
import * as r from "../controllers/report.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";

const router = express.Router();
router.use(protect, authorize("administrador", "auditor"));

// ============ REPORTES FINANCIEROS Y OPERATIVOS ============
router.get("/reports/income", r.income);
router.get("/reports/usage", r.usage);
router.get("/reports/status", r.status);
router.get("/reports/methods", r.methods);
router.get("/reports/expenses", r.expenses);
router.get("/reports/finance", r.finance);
router.get("/reports/dead-slots", r.getDeadSlots);

export default router;

