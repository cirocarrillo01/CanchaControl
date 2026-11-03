// backend/src/services/report.service.js
import { pool } from "../config/db.js";
import { nowBogota } from "../utils/time.js";

/** RF40: ingresos por rango, con devoluciones descontadas del neto. */
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
            SUM(CASE WHEN p.kind = 'devolucion' THEN p.amount ELSE 0 END) AS devoluciones,
            SUM(CASE WHEN p.kind = 'devolucion' THEN -p.amount ELSE p.amount END) AS total_neto,
            COUNT(DISTINCT CASE WHEN p.kind <> 'devolucion' THEN p.booking_id END) AS bookings
       FROM payments p
      WHERE DATE(p.paid_at) BETWEEN ? AND ?
      GROUP BY ${expr}
      ORDER BY period`,
    [start, end],
  );

  // Total de reservas distintas con pago neto positivo (excluye las reembolsadas íntegramente)
  // para que el ticket promedio no se distorsione por devoluciones totales.
  const [[{ bookings_neto_positivo }]] = await pool.query(
    `SELECT COUNT(DISTINCT booking_id) AS bookings_neto_positivo
       FROM payments
      WHERE DATE(paid_at) BETWEEN ? AND ?
        AND booking_id IN (
          SELECT booking_id
          FROM payments
          WHERE DATE(paid_at) BETWEEN ? AND ?
          GROUP BY booking_id
          HAVING SUM(CASE WHEN kind = 'devolucion' THEN -amount ELSE amount END) > 0
        )`,
    [start, end, start, end],
  );

  const total_neto = rows.reduce((a, r) => a + Number(r.total_neto || 0), 0);
  const total_bruto = rows.reduce(
    (a, r) => a + Number(r.reservas || 0) + Number(r.adicionales || 0),
    0,
  );
  const total_devoluciones = rows.reduce(
    (a, r) => a + Number(r.devoluciones || 0),
    0,
  );
  // ← NUEVO: total de reservas distintas con pago neto positivo (para ticket promedio)
  const total_bookings = Number(bookings_neto_positivo || 0);

  return {
    from: start,
    to: end,
    groupBy: gb,
    total: total_neto,
    total_bruto,
    total_neto,
    total_devoluciones,
    total_bookings, // ← nuevo campo
    days: rows,
  };
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

/** RF43: desglose por método de pago (incluye devoluciones separadas). */
export const methodsReport = async ({ from, to } = {}) => {
  const start = from || nowBogota().date;
  const end = to || nowBogota().date;
  const [rows] = await pool.query(
    `SELECT method,
            SUM(CASE WHEN kind <> 'devolucion' THEN amount ELSE 0 END) AS bruto,
            SUM(CASE WHEN kind = 'devolucion' THEN amount ELSE 0 END) AS devoluciones,
            SUM(CASE WHEN kind = 'devolucion' THEN -amount ELSE amount END) AS neto,
            COUNT(CASE WHEN kind <> 'devolucion' THEN 1 END) AS count
       FROM payments
      WHERE DATE(paid_at) BETWEEN ? AND ?
      GROUP BY method
      ORDER BY neto DESC`,
    [start, end],
  );
  return { from: start, to: end, methods: rows };
};
