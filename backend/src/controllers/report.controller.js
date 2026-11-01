// backend/src/controllers/report.controller.js
import { asyncHandler } from "../utils/asyncHandler.js";
import * as reports from "../services/report.service.js";

export const income = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await reports.incomeReport(req.query) });
});
export const usage = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await reports.usageReport(req.query) });
});
export const status = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await reports.statusReport(req.query) });
});
