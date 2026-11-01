// backend/src/services/report.service.js
import { pool } from "../config/db.js";
import { nowBogota } from "../utils/time.js";

/** RF40: ingresos por rango. */
export const incomeReport = async ({ from, to } = {}) => {
  const start = from || nowBogota().date;
  const end = to || nowBogota().date;
  const [rows] = await pool.query(
    `SELECT DATE(p.paid_at) AS day,
            SUM(CASE WHEN p.kind = 'reserva' THEN p.amount ELSE 0 END) AS reservas,
            SUM(CASE WHEN p.kind = 'tiempo_adicional' THEN p.amount ELSE 0 END) AS adicionales,
            SUM(p.amount) AS total
       FROM payments p
      WHERE DATE(p.paid_at) BETWEEN ? AND ?
      GROUP BY DATE(p.paid_at)
      ORDER BY day`,
    [start, end],
  );
  const total = rows.reduce((a, r) => a + Number(r.total || 0), 0);
  return { from: start, to: end, total, days: rows };
};

/** RF41: uso por cancha. */
export const usageReport = async ({ from, to } = {}) => {
  const start = from || nowBogota().date;
  const end = to || nowBogota().date;
  const [rows] = await pool.query(
    `SELECT c.id, c.name,
            COUNT(b.id) AS total,
            SUM(CASE WHEN b.status = 'finalizada' THEN 1 ELSE 0 END) AS completadas,
            SUM(CASE WHEN b.status = 'cancelada' THEN 1 ELSE 0 END) AS canceladas
       FROM courts c
       LEFT JOIN bookings b ON b.court_id = c.id AND b.date BETWEEN ? AND ?
      GROUP BY c.id, c.name
      ORDER BY c.name`,
    [start, end],
  );
  return { from: start, to: end, courts: rows };
};

/** RF42: reservas por estado. */
export const statusReport = async ({ from, to } = {}) => {
  const start = from || nowBogota().date;
  const end = to || nowBogota().date;
  const [rows] = await pool.query(
    `SELECT status, COUNT(*) AS count FROM bookings
      WHERE date BETWEEN ? AND ? GROUP BY status ORDER BY count DESC`,
    [start, end],
  );
  return { from: start, to: end, statuses: rows };
};
