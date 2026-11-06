// backend/src/controllers/report.controller.js
import * as reportService from "../services/report.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { pool } from "../config/db.js";

export const income = asyncHandler(async (req, res) => {
  const data = await reportService.incomeReport(req.query);
  res.json({ success: true, data });
});

export const usage = asyncHandler(async (req, res) => {
  const data = await reportService.usageReport(req.query);
  res.json({ success: true, data });
});

export const status = asyncHandler(async (req, res) => {
  const data = await reportService.statusReport(req.query);
  res.json({ success: true, data });
});

export const methods = asyncHandler(async (req, res) => {
  const data = await reportService.methodsReport(req.query);
  res.json({ success: true, data });
});

export const expenses = asyncHandler(async (req, res) => {
  const data = await reportService.expenseReport(req.query);
  res.json({ success: true, data });
});

export const finance = asyncHandler(async (req, res) => {
  const data = await reportService.financeReport(req.query);
  res.json({ success: true, data });
});

export const getDeadSlots = asyncHandler(async (req, res) => {
  const { month, year } = req.query;
  const [rows] = await pool.query(
    `
      SELECT 
          DAY(slot_date) as day,
          slot_start,
          COUNT(*) as frequency
      FROM court_slots
      WHERE MONTH(slot_date) = ? AND YEAR(slot_date) = ?
      AND booking_id IS NULL
      GROUP BY day, slot_start
      ORDER BY frequency DESC
      LIMIT 10
  `,
    [month || new Date().getMonth() + 1, year || new Date().getFullYear()],
  );

  res.status(200).json({ success: true, data: rows });
});
