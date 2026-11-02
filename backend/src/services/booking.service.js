// backend/src/services/booking.service.js
import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { pool, withTransaction } from "../config/db.js";
import { AppError } from "../utils/AppError.js";
import { logAction } from "../utils/audit.js";
import {
  addDays,
  addMinutes,
  diffSeconds,
  nowBogota,
  toMin,
} from "../utils/time.js";
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

const decorate = (b) => {
  const totalPaid = Number(b.paid_reservation ?? 0) + Number(b.paid_extra ?? 0);
  return {
    ...b,
    payment_status:
      totalPaid > 0
        ? totalPaid >= Number(b.price_total)
          ? "pagado"
          : "parcial"
        : "pendiente",
  };
};

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

const hhmmss = (min) => {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
};

const dayDiff = (fromDate, toDate) =>
  Math.round(
    (new Date(`${toDate}T00:00:00`) - new Date(`${fromDate}T00:00:00`)) /
      86400000,
  );

/** Verifica la contraseña del propio administrador que hace la acción. */
const verifyAdminPassword = async (userId, password, db = pool) => {
  if (!password)
    throw new AppError(400, "Se requiere la contraseña del administrador");
  const [[u]] = await db.query("SELECT password FROM users WHERE id = ?", [
    userId,
  ]);
  if (!u) throw new AppError(401, "Usuario no encontrado");
  if (!(await bcrypt.compare(password, u.password)))
    throw new AppError(401, "Contraseña del administrador incorrecta");
};

/**
 * Verifica que el slot indicado esté libre para extender.
 * Devuelve { ok:true } o { ok:false, message } explicando el motivo.
 */
const checkNextSlotAvailable = async (conn, courtId, date, startTime) => {
  const [[row]] = await conn.query(
    `SELECT s.kind, s.booking_id,
            b.id AS b_id, b.code, b.status, b.price_total,
            COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.booking_id = b.id), 0) AS paid_total
       FROM court_slots s
       LEFT JOIN bookings b ON b.id = s.booking_id
      WHERE s.court_id = ? AND s.slot_date = ? AND s.slot_start = ?`,
    [courtId, date, startTime],
  );

  if (!row) return { ok: true };

  if (row.kind === "bloqueo")
    return {
      ok: false,
      message: "El siguiente bloque está bloqueado (mantenimiento).",
    };

  const code = row.code || "—";
  if (row.status === "procesando")
    return {
      ok: false,
      message: `El siguiente bloque tiene una reserva en proceso (${code}) esperando pago/aprobación.`,
    };

  if (row.status === "ocupada") {
    const isPaid = Number(row.paid_total) >= Number(row.price_total);
    if (!isPaid)
      return {
        ok: false,
        message: `El siguiente bloque está apartado por la reserva ${code}, pero tiene pago pendiente.`,
      };
    return {
      ok: false,
      message: `El siguiente bloque ya está ocupado por la reserva ${code} (pagada y aprobada).`,
    };
  }

  if (row.status === "en_curso")
    return {
      ok: false,
      message: `El siguiente bloque ya está vigente (${code}).`,
    };

  return {
    ok: false,
    message: `El siguiente bloque tiene una reserva en estado ${row.status} (${code}).`,
  };
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

  const sql = `${BOOKING_SELECT}${whereSql}
    ORDER BY (b.status IN ('cancelada','vencida')) ASC,
             ABS(DATEDIFF(b.date, CURDATE())) ASC,
             b.date DESC, b.start_time DESC
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

/**
 * ← NUEVO: /hoy devuelve end_time + effective_status calculados en tiempo real.
 * Una reserva 'ocupada' se convierte en 'en_curso' cuando pasa la hora de inicio
 * y en 'finalizada' cuando pasa la hora de fin + extras.
 */
export const getToday = async () => {
  const now = nowBogota();
  const today = now.date;
  const settings = await getSettings();
  const block = resolveSpan(settings.block_minutes);
  const nowSec = toMin(now.time) * 60 + Number(now.time.split(":")[2] || 0);

  const [rows] = await pool.query(
    `${BOOKING_SELECT} WHERE b.date = ? ORDER BY b.start_time`,
    [today],
  );

  return rows.map((b) => {
    const startMin = toMin(b.start_time);
    const endMin =
      startMin + b.duration_blocks * block + (b.extra_minutes ?? 0);
    const startSec = startMin * 60;
    const endSec = endMin * 60;

    let effective_status = b.status;
    if (b.status === "ocupada" || b.status === "en_curso") {
      if (nowSec >= endSec) effective_status = "finalizada";
      else if (nowSec >= startSec) effective_status = "en_curso";
      else effective_status = "ocupada";
    }

    return {
      ...decorate(b),
      effective_status,
      end_time: hhmmss(endMin),
    };
  });
};

// ---------------------------------------------------------------------------
// CRONÓMETROS
// ---------------------------------------------------------------------------
/**
 * ← NUEVO: filtra reservas ya expiradas. Solo muestra lo vigente o lo próximo.
 * El overtime ya no crece indefinidamente: al terminar, la reserva desaparece
 * (el job autoFinalize la pasa a 'finalizada' en la BD).
 */
export const getTimers = async () => {
  const now = nowBogota();
  const today = now.date;
  const settings = await getSettings();
  const holidays = await loadHolidays();
  const rates = await loadRates();
  const block = resolveSpan(settings.block_minutes);
  const closeMin = toMin(settings.close_time);
  const nowSec = toMin(now.time) * 60 + Number(now.time.split(":")[2] || 0);

  const [courts] = await pool.query(
    "SELECT id, name FROM courts WHERE status = 'activa' ORDER BY name",
  );

  const [bookings] = await pool.query(
    `${BOOKING_SELECT}
       WHERE b.status IN ('ocupada','en_curso')
         AND b.date >= ? AND b.date <= DATE_ADD(?, INTERVAL 60 DAY)
       ORDER BY b.date, b.start_time`,
    [today, today],
  );

  const [slots] = await pool.query(
    `SELECT court_id, slot_date, slot_start FROM court_slots
      WHERE slot_date >= ? AND slot_date <= DATE_ADD(?, INTERVAL 60 DAY)`,
    [today, today],
  );
  const slotSet = new Set(
    slots.map((s) => `${s.court_id}|${s.slot_date}|${s.slot_start}`),
  );

  const enriched = bookings
    .map((b) => {
      const startMin = toMin(b.start_time);
      const totalMin = b.duration_blocks * block + (b.extra_minutes ?? 0);
      const endMin = startMin + totalMin;
      const startSec = startMin * 60;
      const endSec = endMin * 60;

      const expired = b.date < today || (b.date === today && nowSec >= endSec);

      let phase,
        priority,
        remaining = 0;
      if (b.date === today) {
        if (nowSec < startSec) {
          phase = "upcoming";
          priority = 2;
          remaining = startSec - nowSec;
        } else {
          phase = "active";
          priority = 0;
          remaining = endSec - nowSec;
        }
      } else {
        const dd = dayDiff(today, b.date);
        phase = "upcoming";
        priority = 3;
        remaining = dd * 86400 + startSec - nowSec;
      }

      return {
        ...b,
        _expired: expired,
        _phase: phase,
        _priority: priority,
        _remaining: remaining,
        _totalSec: totalMin * 60,
        _endMin: endMin,
        _isToday: b.date === today,
      };
    })
    .filter((b) => !b._expired);

  return courts.map((court) => {
    const candidates = enriched
      .filter((b) => b.court_id === court.id)
      .sort((a, b) => {
        if (a._priority !== b._priority) return a._priority - b._priority;
        if (a.date !== b.date) return a.date < b.date ? -1 : 1;
        return a.start_time < b.start_time ? -1 : 1;
      });

    const current = candidates[0];
    if (!current) {
      return {
        court_id: court.id,
        court_name: court.name,
        phase: "free",
        status: null,
        booking: null,
        date: null,
        is_today: true,
        start_time: null,
        end_time: null,
        total_seconds: 0,
        remaining_seconds: 0,
        overtime_seconds: 0,
        next_block: null,
        server_time: now.datetime,
        block_minutes: block,
      };
    }

    const endMin = current._endMin;
    const nextStartMin = endMin;
    const nextEndMin = nextStartMin + block;
    const nextDate = current.date;
    const nextFree =
      nextEndMin <= closeMin &&
      !slotSet.has(`${court.id}|${nextDate}|${hhmmss(nextStartMin)}`);
    const nextPrice = nextFree
      ? priceFor(rates, court.id, nextDate, hhmmss(nextStartMin), holidays)
      : 0;

    return {
      court_id: court.id,
      court_name: court.name,
      phase: current._phase,
      status: current.status,
      booking: decorate(current),
      date: current.date,
      is_today: current._isToday,
      start_time: current.start_time,
      end_time: hhmmss(endMin),
      total_seconds: current._totalSec,
      remaining_seconds: Math.max(0, current._remaining),
      overtime_seconds: 0,
      next_block: {
        date: nextDate,
        start: hhmmss(nextStartMin),
        end: hhmmss(nextEndMin),
        free: nextFree,
        price: nextPrice,
      },
      server_time: now.datetime,
      block_minutes: block,
    };
  });
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

  return withTransaction(async (conn) => {
    const code = await uniqueCode(conn);
    const priceTotal = price * duration_blocks;

    const [r] = await conn.query(
      `INSERT INTO bookings
        (code, court_id, date, start_time, duration_blocks, price_total,
         customer_id, customer_name, customer_phone, status, expires_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'procesando', ?, ?)`,
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
        expiresAt,
        user.id,
      ],
    );

    const rows = [];
    const startMin =
      Number(start_time.split(":")[0]) * 60 + Number(start_time.split(":")[1]);
    for (let i = 0; i < duration_blocks; i++) {
      rows.push([
        court_id,
        date,
        hhmmss(startMin + i * block),
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
export const rescheduleBooking = async (id, { date, start_time }, user) => {
  if (!date || !start_time) throw new AppError(400, "Fecha y hora requeridas");
  if (isPast(date, start_time))
    throw new AppError(400, "No puedes reprogramar a una fecha u hora pasada");

  return withTransaction(async (conn) => {
    const booking = await findOrFail(id, conn);
    if (["finalizada", "cancelada", "vencida"].includes(booking.status))
      throw new AppError(
        409,
        `No se puede reprogramar una reserva ${booking.status}`,
      );

    const settings = await getSettings();
    const blocks = booking.duration_blocks;

    await conn.query("DELETE FROM court_slots WHERE booking_id = ?", [id]);

    const startMin =
      Number(start_time.split(":")[0]) * 60 + Number(start_time.split(":")[1]);
    const rows = [];
    for (let i = 0; i < blocks; i++) {
      rows.push([
        booking.court_id,
        date,
        hhmmss(startMin + i * settings.block_minutes),
        "reserva",
        id,
        null,
        user.id,
      ]);
    }
    await insertSlots(conn, rows, `${date} ${start_time}`);

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
    if (booking.status === "finalizada")
      throw new AppError(409, "No se puede cancelar una reserva finalizada");

    if (user.role === "cliente") {
      if (booking.customer_id !== user.id)
        throw new AppError(
          403,
          "No puedes cancelar una reserva que no es tuya",
        );
      const settings = await getSettings();
      const hours =
        diffSeconds(
          nowBogota().datetime,
          `${booking.date} ${booking.start_time}`,
        ) / 3600;
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

    const totalPaid =
      Number(booking.paid_reservation ?? 0) + Number(booking.paid_extra ?? 0);
    const saldo = Number(booking.price_total) - totalPaid;
    if (Number(amount) > saldo)
      throw new AppError(400, `El pago excede el saldo pendiente (${saldo})`);

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
// EXTENSIONES — requieren contraseña + pago atómico
// ---------------------------------------------------------------------------
export const addExtraTime = async (
  id,
  { minutes, amount, method = "efectivo", admin_password, note },
  user,
) => {
  const mins = Number(minutes);
  const amt = Number(amount);
  if (!mins || mins <= 0) throw new AppError(400, "Minutos inválidos");
  if (!amt || amt <= 0) throw new AppError(400, "Monto inválido");

  await verifyAdminPassword(user.id, admin_password, pool);

  return withTransaction(async (conn) => {
    const booking = await findOrFail(id, conn);
    if (!["ocupada", "en_curso", "finalizada"].includes(booking.status))
      throw new AppError(
        409,
        `No se puede agregar tiempo extra en estado ${booking.status}`,
      );

    const settings = await getSettings();
    const block = resolveSpan(settings.block_minutes);
    const closeMin = toMin(settings.close_time);

    const startMin = toMin(booking.start_time);
    const baseEnd = startMin + booking.duration_blocks * block;
    const newEnd = baseEnd + (booking.extra_minutes ?? 0) + mins;

    if (newEnd > closeMin)
      throw new AppError(400, "El tiempo extra supera el horario de cierre");

    const nextSlotStart = hhmmss(baseEnd);
    const check = await checkNextSlotAvailable(
      conn,
      booking.court_id,
      booking.date,
      nextSlotStart,
    );
    if (!check.ok) throw new AppError(409, check.message);

    await conn.query(
      `UPDATE bookings
         SET extra_minutes = extra_minutes + ?,
             price_total = price_total + ?,
             status = 'en_curso'
       WHERE id = ?`,
      [mins, amt, id],
    );

    const [pr] = await conn.query(
      "INSERT INTO payments (booking_id, amount, kind, method, note, created_by) VALUES (?, ?, 'tiempo_adicional', ?, ?, ?)",
      [id, amt, method, note ?? null, user.id],
    );

    await logAction(conn, {
      entity: "booking",
      entityId: Number(id),
      action: "tiempo_extra",
      userId: user.id,
      detail: { minutes: mins, amount: amt, payment_id: pr.insertId },
    });

    return findOrFail(id, conn);
  });
};

export const addNextBlock = async (
  id,
  { amount, method = "efectivo", admin_password, note },
  user,
) => {
  await verifyAdminPassword(user.id, admin_password, pool);

  return withTransaction(async (conn) => {
    const booking = await findOrFail(id, conn);
    if (!["ocupada", "en_curso", "finalizada"].includes(booking.status))
      throw new AppError(
        409,
        `No se puede extender en estado ${booking.status}`,
      );

    if ((booking.extra_minutes ?? 0) > 0)
      throw new AppError(
        409,
        "Finaliza o cancela el tiempo extra antes de agregar un bloque completo.",
      );

    const settings = await getSettings();
    const holidays = await loadHolidays();
    const rates = await loadRates();
    const block = resolveSpan(settings.block_minutes);

    const startMin = toMin(booking.start_time);
    const nextStartMin = startMin + booking.duration_blocks * block;
    const nextEndMin = nextStartMin + block;

    if (nextEndMin > toMin(settings.close_time))
      throw new AppError(400, "Ya no hay más bloques después del cierre");

    const nextStart = hhmmss(nextStartMin);

    const check = await checkNextSlotAvailable(
      conn,
      booking.court_id,
      booking.date,
      nextStart,
    );
    if (!check.ok) throw new AppError(409, check.message);

    const price = amount
      ? Number(amount)
      : priceFor(rates, booking.court_id, booking.date, nextStart, holidays);
    if (!price || price <= 0)
      throw new AppError(
        400,
        "Monto inválido o sin tarifa configurada para el bloque",
      );

    try {
      await conn.query(
        "INSERT INTO court_slots (court_id, slot_date, slot_start, kind, booking_id, reason, created_by) VALUES (?, ?, ?, 'reserva', ?, NULL, ?)",
        [booking.court_id, booking.date, nextStart, id, user.id],
      );
    } catch (e) {
      if (e.code === "ER_DUP_ENTRY")
        throw new AppError(409, "El siguiente bloque ya está ocupado");
      throw e;
    }

    await conn.query(
      `UPDATE bookings
         SET duration_blocks = duration_blocks + 1,
             price_total = price_total + ?,
             status = 'en_curso'
       WHERE id = ?`,
      [price, id],
    );

    const [pr] = await conn.query(
      "INSERT INTO payments (booking_id, amount, kind, method, note, created_by) VALUES (?, ?, 'tiempo_adicional', ?, ?, ?)",
      [id, price, method, note ?? null, user.id],
    );

    await logAction(conn, {
      entity: "booking",
      entityId: Number(id),
      action: "bloque_extra",
      userId: user.id,
      detail: { next_start: nextStart, price, payment_id: pr.insertId },
    });

    return findOrFail(id, conn);
  });
};

// ---------------------------------------------------------------------------
// LEGACY cronómetro manual + checkin
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
      `UPDATE bookings SET status = 'en_curso', timer_started_at = ?, timer_ends_at = ?, extra_minutes = ? WHERE id = ?`,
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
