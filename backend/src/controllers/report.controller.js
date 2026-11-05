// backend/src/controllers/report.controller.js
import { asyncHandler } from "../utils/asyncHandler.js";
import * as reports from "../services/report.service.js";
import * as expenseSvc from "../services/expense.service.js";
import * as cashSvc from "../services/cash.service.js";

// ============ REPORTES ============

export const income = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await reports.incomeReport(req.query) });
});
export const usage = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await reports.usageReport(req.query) });
});
export const status = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await reports.statusReport(req.query) });
});
export const methods = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await reports.methodsReport(req.query) });
});
export const expenses = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await reports.expenseReport(req.query) });
});
export const finance = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await reports.financeReport(req.query) });
});

// ============ GASTOS (CRUD) ============

export const listExpenses = asyncHandler(async (req, res) => {
  const data = await expenseSvc.listExpenses(req.query);
  res.json({ success: true, ...data });
});

export const createExpense = asyncHandler(async (req, res) => {
  const data = await expenseSvc.createExpense(req.body, req.user);
  res.status(201).json({ success: true, data });
});

export const updateExpense = asyncHandler(async (req, res) => {
  const data = await expenseSvc.updateExpense(Number(req.params.id), req.body, req.user);
  res.json({ success: true, data });
});

export const deleteExpense = asyncHandler(async (req, res) => {
  const data = await expenseSvc.deleteExpense(Number(req.params.id), req.user);
  res.json({ success: true, data });
});

export const expenseSummary = asyncHandler(async (req, res) => {
  const data = await expenseSvc.expenseSummary(req.query);
  res.json({ success: true, data });
});

// ============ CAJA DIARIA ============

export const getOpenCash = asyncHandler(async (req, res) => {
  const data = await cashSvc.getOpenCash(req.query.open_date);
  res.json({ success: true, data });
});

export const openCash = asyncHandler(async (req, res) => {
  const data = await cashSvc.openCash(req.body, req.user);
  res.status(201).json({ success: true, data });
});

export const closeCash = asyncHandler(async (req, res) => {
  const data = await cashSvc.closeCash(req.body, req.user);
  res.json({ success: true, data });
});

export const cashFlow = asyncHandler(async (req, res) => {
  const data = await cashSvc.cashFlow(req.query);
  res.json({ success: true, data });
});
