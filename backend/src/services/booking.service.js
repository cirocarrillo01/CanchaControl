// backend/src/services/booking.service.js
// Reglas de negocio de reservas, pagos, cronómetro, ingreso y bloqueos.
import { randomInt } from "node:crypto";
import { pool, withTransaction } from "../config/db.js";
import { AppError } from "../utils/AppError.js";
import { logAction } from "../utils/audit.js";
import { addDays, addMinutes, diffSeconds, nowBogota } from "../utils/time.js";
import {
  getSettings,
  loadRates,
  loadHolidays,
  priceFor,
  resolveSpan,
  isPast,
} from "./schedule.service.js";
import { MAX_PENDING_ONLINE } from "../config/constants.js";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const BOOKING_SELECT = `
  SELECT b.*, c.name AS court_name,
    COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.booking_id = b.id AND p.kind = 'reserva'), 0) AS paid_reservation,
    COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.booking_id = b.id AND p.kind = 'tiempo_adicional'), 0) AS paid_extra
  FROM bookings b JOIN courts c ON c.id = b.court_id`;

const decorate = (b) => ({
  ...b,
  payment_status:
    b.paid_reservation > 0
      ? b.paid_reservation >= b.price_total
        ? "pagado"
        : "parcial"
      : "pendiente",
});

const findOrFail = async (id, db = pool) => {
  const [rows] = await db.query(`${BOOKING_SELECT} WHERE b.id = ?`, [id]);
  if (!rows[0]) throw new AppError(404, "Reserva no encontrada");
  return decorate(rows[0]);
};

const uniqueCode = async (conn) => {
  for (let i = 0; i < 10; i++) {
    const code = Array.from(
      { length: 6 },
      () => CODE_CHARS[randomInt(CODE_CHARS.length)],
    ).join("");
    const [r] = await conn.query("SELECT id FROM bookings WHERE code = ?", [
      code,
    ]);
    if (!r.length) return code;
  }
  throw new AppError(500, "No se pudo generar un código de turno");
};

const insertSlots = async (conn, rows, label) => {
  try {
    await conn.query(
      "INSERT INTO court_slots (court_id, slot_date, slot_start, kind, booking_id, reason, created_by) VALUES ?",
      [rows],
    );
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY")
      throw new AppError(
        409,
        `El horario ${label} ya está ocupado o bloqueado`,
      );
    throw e;
  }
};

const assertActiveCourt = async (courtId, db = pool) => {
  const [[court]] = await db.query(
    "SELECT id, status FROM courts WHERE id = ?",
    [courtId],
  );
  if (!court) throw new AppError(404, "Cancha no encontrada");
  if (court.status !== "activa")
    throw new AppError(409, "La cancha no está disponible para reservas");
  return court;
};

// ---------------------------------------------------------------------------
// LISTADO / DETALLE
// ---------------------------------------------------------------------------
export const listBookings = async ({ user, filters = {} }) => {
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
  const offset = (page - 1) * limit;

  const where = [];
  const params = [];

  if (user.role === "cliente") {
    where.push("b.customer_id = ?");
    params.push(user.id);
  }
  if (filters.status) {
    where.push("b.status = ?");
    params.push(filters.status);
  }
  if (filters.date) {
    where.push("b.date = ?");
    params.push(filters.date);
  }
  if (filters.q) {
    where.push(
      "(b.code LIKE ? OR b.customer_name LIKE ? OR b.customer_phone LIKE ?)",
    );
    const like = `%${filters.q}%`;
    params.push(like, like, like);
  }

  const whereSql = where.length ? ` WHERE ${where.join(" AND ")}` : "";

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM bookings b${whereSql}`,
    params,
  );
  const total = Number(countRows[0].total);

  // ← FIX: activas primero; cercanas a hoy por encima; vencidas/canceladas al final
  const sql = `${BOOKING_SELECT}${whereSql}
    ORDER BY
      (b.status IN ('cancelada','vencida')) ASC,
      ABS(DATEDIFF(b.date, CURDATE())) ASC,
      b.date DESC,
      b.start_time DESC
    LIMIT ? OFFSET ?`;
  const [rows] = await pool.query(sql, [...params, limit, offset]);

  return {
    data: rows.map(decorate),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const getBookingDetail = async (id, user) => {
  const b = await findOrFail(id);
  if (user.role === "cliente" && b.customer_id !== user.id)
    throw new AppError(403, "No puedes ver una reserva que no es tuya");
  return b;
};

export const getToday = async () => {
  const today = nowBogota().date;
  const [rows] = await pool.query(
    `${BOOKING_SELECT} WHERE b.date = ? ORDER BY b.start_time`,
    [today],
  );
  return rows.map(decorate);
};

export const getTimers = async () => {
  const [rows] = await pool.query(
    `SELECT b.id, b.code, b.court_id, c.name AS court_name, b.status,
            b.timer_started_at, b.timer_ends_at, b.extra_minutes,
            b.customer_name, b.customer_phone
       FROM bookings b JOIN courts c ON c.id = b.court_id
      WHERE b.status IN ('en_curso','ocupada')
      ORDER BY b.timer_ends_at IS NULL, b.timer_ends_at`,
  );
  const now = nowBogota().datetime;
  return rows.map((r) => ({
    ...r,
    remaining_seconds: r.timer_ends_at
      ? Math.max(0, diffSeconds(now, r.timer_ends_at))
      : null,
    overtime: r.timer_ends_at ? diffSeconds(now, r.timer_ends_at) < 0 : false,
  }));
};

// ---------------------------------------------------------------------------
// CREAR
// ---------------------------------------------------------------------------
export const createBooking = async (data, user) => {
  const {
    court_id,
    date,
    start_time,
    customer_name,
    customer_phone,
    duration_blocks = 1,
  } = data;
  if (!court_id || !date || !start_time)
    throw new AppError(400, "Cancha, fecha y hora son obligatorios");

  const settings = await getSettings();
  const holidays = await loadHolidays();
  const block = resolveSpan(settings.block_minutes);
  if (isPast(date, start_time))
    throw new AppError(400, "No se puede reservar un horario pasado");

  await assertActiveCourt(court_id);
  const rates = await loadRates();
  const price = priceFor(rates, court_id, date, start_time, holidays);

  if (user.role === "cliente") {
    const [[{ pending }]] = await pool.query(
      `SELECT COUNT(*) AS pending FROM bookings
        WHERE customer_id = ? AND status = 'procesando' AND expires_at > ?`,
      [user.id, nowBogota().datetime],
    );
    if (pending >= MAX_PENDING_ONLINE)
      throw new AppError(
        429,
        `Máximo ${MAX_PENDING_ONLINE} reservas en proceso a la vez`,
      );
  }

  const expiresAt =
    user.role === "cliente"
      ? addMinutes(nowBogota().datetime, settings.online_hold_minutes)
      : null;
  const initialStatus = "procesando";

  return withTransaction(async (conn) => {
    const code = await uniqueCode(conn);
    const priceTotal = price * duration_blocks;

    const [r] = await conn.query(
      `INSERT INTO bookings
        (code, court_id, date, start_time, duration_blocks, price_total,
         customer_id, customer_name, customer_phone, status, expires_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        code,
        court_id,
        date,
        start_time,
        duration_blocks,
        priceTotal,
        user.role === "cliente" ? user.id : (data.customer_id ?? null),
        customer_name ?? user.name,
        customer_phone ?? user.phone ?? null,
        initialStatus,
        expiresAt,
        user.id,
      ],
    );

    const rows = [];
    const startMin =
      Number(start_time.split(":")[0]) * 60 + Number(start_time.split(":")[1]);
    for (let i = 0; i < duration_blocks; i++) {
      const m = startMin + i * block;
      const hh = String(Math.floor(m / 60)).padStart(2, "0");
      const mm = String(m % 60).padStart(2, "0");
      rows.push([
        court_id,
        date,
        `${hh}:${mm}:00`,
        "reserva",
        r.insertId,
        null,
        user.id,
      ]);
    }
    await insertSlots(conn, rows, `${date} ${start_time}`);

    await logAction(conn, {
      entity: "booking",
      entityId: r.insertId,
      action: "creada",
      userId: user.id,
      detail: {
        court_id,
        date,
        start_time,
        duration_blocks,
        price: priceTotal,
      },
    });

    return findOrFail(r.insertId, conn);
  });
};

// ---------------------------------------------------------------------------
// REPROGRAMAR / CANCELAR / CONFIRMAR
// ---------------------------------------------------------------------------
// ← FIX: la reprogramación SOLO cambia fecha y hora.
//    No se recalcula el precio, no se cambia la duración, no se tocan pagos.
//    El estado de pago (pendiente/parcial/pagado) permanece intacto.
//    Si el admin necesita otra tarifa o duración, debe cancelar y crear una nueva.
export const rescheduleBooking = async (id, { date, start_time }, user) => {
  if (!date || !start_time) throw new AppError(400, "Fecha y hora requeridas");
  if (isPast(date, start_time))
    throw new AppError(400, "No puedes reprogramar al pasado");

  return withTransaction(async (conn) => {
    const booking = await findOrFail(id, conn);
    if (["finalizada", "cancelada", "vencida"].includes(booking.status))
      throw new AppError(
        409,
        `No se puede reprogramar una reserva ${booking.status}`,
      );

    const settings = await getSettings();
    // Se conserva la duración original
    const blocks = booking.duration_blocks;

    // Liberar slots viejos
    await conn.query("DELETE FROM court_slots WHERE booking_id = ?", [id]);

    // Crear slots nuevos (mismos bloques, nueva fecha/hora)
    const startMin =
      Number(start_time.split(":")[0]) * 60 + Number(start_time.split(":")[1]);
    const rows = [];
    for (let i = 0; i < blocks; i++) {
      const m = startMin + i * settings.block_minutes;
      const hh = String(Math.floor(m / 60)).padStart(2, "0");
      const mm = String(m % 60).padStart(2, "0");
      rows.push([
        booking.court_id,
        date,
        `${hh}:${mm}:00`,
        "reserva",
        id,
        null,
        user.id,
      ]);
    }
    await insertSlots(conn, rows, `${date} ${start_time}`);

    // Solo actualiza fecha y hora. price_total y duration_blocks se conservan.
    await conn.query(
      "UPDATE bookings SET date = ?, start_time = ? WHERE id = ?",
      [date, start_time, id],
    );

    await logAction(conn, {
      entity: "booking",
      entityId: Number(id),
      action: "reprogramada",
      userId: user.id,
      detail: {
        from: { date: booking.date, start_time: booking.start_time },
        to: { date, start_time },
        price_kept: booking.price_total,
      },
    });

    return findOrFail(id, conn);
  });
};

export const cancelBooking = async (id, { reason }, user) => {
  return withTransaction(async (conn) => {
    const booking = await findOrFail(id, conn);
    if (booking.status === "cancelada")
      throw new AppError(409, "Ya estaba cancelada");
    if (["finalizada"].includes(booking.status))
      throw new AppError(409, "No se puede cancelar una reserva finalizada");

    if (user.role === "cliente") {
      if (booking.customer_id !== user.id)
        throw new AppError(
          403,
          "No puedes cancelar una reserva que no es tuya",
        );
      const settings = await getSettings();
      const now = nowBogota().datetime;
      const hours =
        diffSeconds(now, `${booking.date} ${booking.start_time}`) / 3600;
      if (hours < settings.min_cancel_hours)
        throw new AppError(
          409,
          `Debes cancelar con al menos ${settings.min_cancel_hours}h de anticipación`,
        );
    }

    await conn.query("DELETE FROM court_slots WHERE booking_id = ?", [id]);
    await conn.query(
      "UPDATE bookings SET status = 'cancelada', cancel_reason = ?, cancelled_by = ?, cancelled_at = ? WHERE id = ?",
      [reason ?? null, user.id, nowBogota().datetime, id],
    );
    await logAction(conn, {
      entity: "booking",
      entityId: Number(id),
      action: "cancelada",
      userId: user.id,
      detail: { reason },
    });
    return findOrFail(id, conn);
  });
};

export const confirmBooking = async (id, user) => {
  return withTransaction(async (conn) => {
    const booking = await findOrFail(id, conn);
    if (booking.status !== "procesando")
      throw new AppError(
        409,
        `Solo se confirman reservas en proceso (actual: ${booking.status})`,
      );

    // Exigir pago completo antes de aprobar
    if (booking.payment_status !== "pagado")
      throw new AppError(
        409,
        "Registra el pago completo antes de aprobar la reserva",
      );

    await conn.query(
      "UPDATE bookings SET status = 'ocupada', expires_at = NULL WHERE id = ?",
      [id],
    );
    await logAction(conn, {
      entity: "booking",
      entityId: Number(id),
      action: "aprobada",
      userId: user.id,
    });
    return findOrFail(id, conn);
  });
};

// ---------------------------------------------------------------------------
// PAGOS
// ---------------------------------------------------------------------------
export const registerPayment = async (
  id,
  { amount, kind = "reserva", method = "efectivo", note },
  user,
) => {
  if (!amount || Number(amount) <= 0) throw new AppError(400, "Monto inválido");
  if (!["reserva", "tiempo_adicional"].includes(kind))
    throw new AppError(400, "Tipo de pago inválido");

  return withTransaction(async (conn) => {
    const booking = await findOrFail(id, conn);
    if (["cancelada", "vencida"].includes(booking.status))
      throw new AppError(
        409,
        `No se puede cobrar una reserva ${booking.status}`,
      );

    if (kind === "reserva") {
      const saldo = booking.price_total - booking.paid_reservation;
      if (Number(amount) > saldo)
        throw new AppError(400, `El pago excede el saldo pendiente (${saldo})`);
    }

    const [r] = await conn.query(
      "INSERT INTO payments (booking_id, amount, kind, method, note, created_by) VALUES (?, ?, ?, ?, ?, ?)",
      [id, amount, kind, method, note ?? null, user.id],
    );
    await logAction(conn, {
      entity: "payment",
      entityId: r.insertId,
      action: "registrado",
      userId: user.id,
      detail: { booking_id: Number(id), amount, kind },
    });
    return { id: r.insertId, booking: await findOrFail(id, conn) };
  });
};

// ---------------------------------------------------------------------------
// CRONÓMETRO
// ---------------------------------------------------------------------------
export const startTimer = async (id, { extra_minutes = 0 }, user) => {
  return withTransaction(async (conn) => {
    const booking = await findOrFail(id, conn);
    if (booking.timer_started_at)
      throw new AppError(409, "El cronómetro ya fue iniciado");
    if (!["ocupada", "en_curso"].includes(booking.status))
      throw new AppError(
        409,
        `No se puede iniciar cronómetro en estado ${booking.status}`,
      );

    const start = nowBogota().datetime;
    const totalMin = booking.duration_blocks * 60 + Number(extra_minutes);
    const ends = addMinutes(start, totalMin);

    await conn.query(
      `UPDATE bookings SET status = 'en_curso', timer_started_at = ?, timer_ends_at = ?,
              extra_minutes = ? WHERE id = ?`,
      [start, ends, Number(extra_minutes), id],
    );
    await logAction(conn, {
      entity: "booking",
      entityId: Number(id),
      action: "cronometro_iniciado",
      userId: user.id,
      detail: { extra_minutes },
    });
    return findOrFail(id, conn);
  });
};

export const finishTimer = async (id, user) => {
  return withTransaction(async (conn) => {
    const booking = await findOrFail(id, conn);
    if (booking.status !== "en_curso")
      throw new AppError(
        409,
        `Solo se finaliza desde 'en_curso' (actual: ${booking.status})`,
      );

    await conn.query(
      "UPDATE bookings SET status = 'finalizada', finished_at = ? WHERE id = ?",
      [nowBogota().datetime, id],
    );
    await logAction(conn, {
      entity: "booking",
      entityId: Number(id),
      action: "finalizada",
      userId: user.id,
    });
    return findOrFail(id, conn);
  });
};

export const checkIn = async (id, user) => {
  return withTransaction(async (conn) => {
    const booking = await findOrFail(id, conn);
    if (booking.checked_in_at)
      throw new AppError(409, "El cliente ya fue marcado como ingresado");
    await conn.query("UPDATE bookings SET checked_in_at = ? WHERE id = ?", [
      nowBogota().datetime,
      id,
    ]);
    await logAction(conn, {
      entity: "booking",
      entityId: Number(id),
      action: "ingreso",
      userId: user.id,
    });
    return findOrFail(id, conn);
  });
};

// ---------------------------------------------------------------------------
// BLOQUEOS
// ---------------------------------------------------------------------------
export const createBlock = async (
  { court_id, date, start_time, reason },
  user,
) => {
  if (!court_id || !date || !start_time)
    throw new AppError(400, "Cancha, fecha y hora requeridas");
  if (isPast(date, start_time))
    throw new AppError(400, "No puedes bloquear un horario pasado");
  await assertActiveCourt(court_id);

  return withTransaction(async (conn) => {
    await insertSlots(
      conn,
      [
        [
          court_id,
          date,
          start_time,
          "bloqueo",
          null,
          reason ?? "Bloqueo manual",
          user.id,
        ],
      ],
      `${date} ${start_time}`,
    );
    await logAction(conn, {
      entity: "block",
      entityId: null,
      action: "creado",
      userId: user.id,
      detail: { court_id, date, start_time, reason },
    });
    return { court_id, date, start_time, reason };
  });
};

export const removeBlock = async (slotId, user) => {
  return withTransaction(async (conn) => {
    const [[slot]] = await conn.query(
      "SELECT id, kind, booking_id FROM court_slots WHERE id = ?",
      [slotId],
    );
    if (!slot) throw new AppError(404, "Bloqueo no encontrado");
    if (slot.kind !== "bloqueo")
      throw new AppError(
        400,
        "Solo se pueden eliminar bloqueos manuales (no reservas)",
      );

    await conn.query("DELETE FROM court_slots WHERE id = ?", [slotId]);
    await logAction(conn, {
      entity: "block",
      entityId: Number(slotId),
      action: "eliminado",
      userId: user.id,
    });
    return { removed: true };
  });
};
