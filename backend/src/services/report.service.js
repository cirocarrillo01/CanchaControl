// backend/src/services/report.service.js
import { pool } from "../config/db.js";
import { nowBogota } from "../utils/time.js";

/** RF40: ingresos por rango, agrupado por día, semana o mes. */
export const incomeReport = async ({ from, to, groupBy = "day" } = {}) => {
  const start = from || nowBogota().date;
  const end = to || nowBogota().date;

  const groupMap = {
    day: "DATE(p.paid_at)",
    week: "DATE_FORMAT(DATE(p.paid_at), '%x-%v')",
    month: "DATE_FORMAT(DATE(p.paid_at), '%Y-%m')",
  };
  const gb = groupMap[groupBy] ? groupBy : "day";
  const expr = groupMap[gb];

  const [rows] = await pool.query(
    `SELECT ${expr} AS period,
            SUM(CASE WHEN p.kind = 'reserva' THEN p.amount ELSE 0 END) AS reservas,
            SUM(CASE WHEN p.kind = 'tiempo_adicional' THEN p.amount ELSE 0 END) AS adicionales,
            SUM(p.amount) AS total
       FROM payments p
      WHERE DATE(p.paid_at) BETWEEN ? AND ?
      GROUP BY ${expr}
      ORDER BY period`,
    [start, end],
  );

  const total = rows.reduce((a, r) => a + Number(r.total || 0), 0);
  return { from: start, to: end, groupBy: gb, total, days: rows };
};

/** RF41: uso por cancha con desglose de todos los estados. */
export const usageReport = async ({ from, to } = {}) => {
  const start = from || nowBogota().date;
  const end = to || nowBogota().date;
  const [rows] = await pool.query(
    `SELECT c.id, c.name,
            COUNT(b.id) AS total,
            SUM(CASE WHEN b.status = 'procesando' THEN 1 ELSE 0 END) AS procesando,
            SUM(CASE WHEN b.status = 'ocupada' THEN 1 ELSE 0 END) AS ocupada,
            SUM(CASE WHEN b.status = 'en_curso' THEN 1 ELSE 0 END) AS en_curso,
            SUM(CASE WHEN b.status = 'finalizada' THEN 1 ELSE 0 END) AS finalizada,
            SUM(CASE WHEN b.status = 'cancelada' THEN 1 ELSE 0 END) AS cancelada,
            SUM(CASE WHEN b.status = 'vencida' THEN 1 ELSE 0 END) AS vencida
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
