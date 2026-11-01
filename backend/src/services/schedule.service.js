// backend/src/services/schedule.service.js
// Lógica de la agenda: configuración, bloques, tarifas, disponibilidad y vencimiento de reservas en línea.
import { pool, withTransaction } from "../config/db.js";
import { logAction } from "../utils/audit.js";
import {
  addDays,
  dayType,
  fromMin,
  isHoliday,
  nowBogota,
  normTime,
  toMin,
} from "../utils/time.js";
import { STAFF_ROLES } from "../config/constants.js";
import { AppError } from "../utils/AppError.js";

const DEFAULTS = {
  open_time: "08:00:00",
  close_time: "23:00:00",
  block_minutes: 60,
  online_hold_minutes: 30,
  min_cancel_hours: 2,
  business_name: "CanchaControl",
};
const NUMERIC = ["block_minutes", "online_hold_minutes", "min_cancel_hours"];

export const getSettings = async (db = pool) => {
  const [rows] = await db.query("SELECT `key`, `value` FROM settings");
  const s = { ...DEFAULTS };
  for (const r of rows) {
    s[r.key] = NUMERIC.includes(r.key)
      ? Number(r.value)
      : r.key.endsWith("_time")
        ? normTime(r.value)
        : r.value;
  }
  return s;
};

export const buildBlocks = (s) => {
  const out = [];
  for (
    let m = toMin(s.open_time);
    m + s.block_minutes <= toMin(s.close_time);
    m += s.block_minutes
  ) {
    out.push({ start: fromMin(m), end: fromMin(m + s.block_minutes) });
  }
  return out;
};

export const priceFor = (rates, courtId, date, start, holidays = []) => {
  const t = toMin(start);
  const dt = dayType(date, holidays);
  const fits = rates.filter(
    (r) =>
      r.day_type === dt && toMin(r.start_time) <= t && t < toMin(r.end_time),
  );
  return (
    (
      fits.find((r) => r.court_id === courtId) ||
      fits.find((r) => r.court_id == null)
    )?.price ?? 0
  );
};

export const loadHolidays = async (db = pool) => {
  const [rows] = await db.query("SELECT holiday_date FROM holidays");
  return rows.map((r) => r.holiday_date);
};

export const expireStale = async () => {
  const now = nowBogota().datetime;
  const [rows] = await pool.query(
    "SELECT id FROM bookings WHERE status = 'procesando' AND expires_at IS NOT NULL AND expires_at < ?",
    [now],
  );
  for (const { id } of rows) {
    await withTransaction(async (conn) => {
      await conn.query("DELETE FROM court_slots WHERE booking_id = ?", [id]);
      await conn.query(
        "UPDATE bookings SET status = 'vencida' WHERE id = ? AND status = 'procesando'",
        [id],
      );
      await logAction(conn, {
        entity: "booking",
        entityId: id,
        action: "vencida",
      });
    });
  }
};

/** RF09-RF13: disponibilidad pública por día. */
export const getAvailability = async ({ date, courtId, viewer }) => {
  date = date || nowBogota().date;
  const settings = await getSettings();
  const holidays = await loadHolidays();
  const isFestivo = isHoliday(date, holidays);
  const defs = buildBlocks(settings);
  const rates = await loadRates();
  const [courts] = await pool.query(
    "SELECT id, name, status FROM courts WHERE status <> 'inactiva' " +
      (courtId ? "AND id = ?" : "") +
      " ORDER BY name",
    courtId ? [courtId] : [],
  );

  // ← FIX: incluir s.kind (antes faltaba → los bloqueos manuales caían como "ocupado")
  const [slots] = await pool.query(
    `SELECT s.id AS slot_id, s.court_id, s.slot_start, s.kind AS slot_kind,
            b.id AS booking_id, b.status AS booking_status
       FROM court_slots s LEFT JOIN bookings b ON b.id = s.booking_id
      WHERE s.slot_date = ?`,
    [date],
  );
  const index = new Map(slots.map((s) => [`${s.court_id}|${s.slot_start}`, s]));

  const result = courts.map((court) => ({
    ...court,
    blocks: defs.map((b) => {
      const slot = index.get(`${court.id}|${b.start}`);
      const block = {
        start: b.start,
        end: b.end,
        past: isPast(date, b.start),
        status: "disponible",
        price: priceFor(rates, court.id, date, b.start, holidays),
        festivo: isFestivo,
      };
      if (block.past) block.status = "pasado";
      if (!slot) return block;

      // ← FIX: el tipo de slot manda; luego el estado del booking
      if (slot.slot_kind === "bloqueo") {
        block.status = "bloqueado";
      } else if (slot.booking_status === "procesando") {
        block.status = "procesando";
      } else if (
        slot.booking_status === "ocupada" ||
        slot.booking_status === "en_curso" ||
        slot.booking_status === "finalizada"
      ) {
        block.status = "ocupado";
      } else {
        // cancelada / vencida / null: no debería haber slot activo
        block.status = "ocupado";
      }
      return block;
    }),
  }));

  return {
    date,
    today: nowBogota().date,
    festivo: isFestivo,
    settings: {
      open_time: settings.open_time,
      close_time: settings.close_time,
      block_minutes: settings.block_minutes,
      online_hold_minutes: settings.online_hold_minutes,
      min_cancel_hours: settings.min_cancel_hours,
    },
    courts: result,
  };
};

export { addDays };

export const loadRates = async (db = pool) =>
  (
    await db.query(
      "SELECT court_id, day_type, start_time, end_time, price FROM rates",
    )
  )[0];

export const resolveSpan = (blockMinutes) => Number(blockMinutes) || 60;

export const isPast = (date, startTime) => {
  const now = nowBogota();
  if (date < now.date) return true;
  if (date > now.date) return false;
  return normTime(startTime) <= now.time;
};
