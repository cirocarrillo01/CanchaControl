// backend/src/routes/report.routes.js
import express from "express";
import * as r from "../controllers/report.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";

const router = express.Router();
router.use(protect, authorize("administrador", "dueno"));

// ============ REPORTES FINANCIEROS ============
router.get("/reports/income", r.income);
router.get("/reports/usage", r.usage);
router.get("/reports/status", r.status);
router.get("/reports/methods", r.methods);
// === Fase 2 DESHABILITADA A PROPOSITO ===
// router.get("/reports/expenses", r.expenses);
// router.get("/reports/finance", r.finance);
// === Fin Fase 2 deshabilitada ==========================

// ============ GASTOS (CRUD) ============
// === Fase 2 DESHABILITADA A PROPOSITO ===
// router.get("/expenses/summary", r.expenseSummary);
// router.get("/expenses", r.listExpenses);
// router.post("/expenses", r.createExpense);
// router.put("/expenses/:id", r.updateExpense);
// router.delete("/expenses/:id", r.deleteExpense);
// === Fin Fase 2 deshabilitada ==========================

// ============ CAJA DIARIA ============
// === Fase 2 DESHABILITADA A PROPOSITO ===
// router.get("/cash/open", r.getOpenCash);
// router.post("/cash/open", r.openCash);
// router.post("/cash/close", r.closeCash);
// router.get("/cash/flow", r.cashFlow);
// === Fin Fase 2 deshabilitada ==========================

export default router;
