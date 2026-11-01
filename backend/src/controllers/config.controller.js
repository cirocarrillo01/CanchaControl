// backend/src/controllers/config.controller.js
import { pool } from "../config/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError, check } from "../utils/AppError.js";
import {
  validateCourt,
  validateRate,
  validateSettings,
  validateHoliday,
} from "../validators/domain.validator.js";
import { getSettings, loadHolidays } from "../services/schedule.service.js";
import { logAction } from "../utils/audit.js";

/** @route GET /api/courts · Público (las inactivas solo las ve el administrador). */
export const listCourts = asyncHandler(async (req, res) => {
  const isAdmin = req.user?.role === "administrador";
  const [rows] = await pool.query(
    `SELECT id, name, description, status FROM courts ${isAdmin ? "" : "WHERE status <> 'inactiva'"} ORDER BY name`,
  );
  res.json({ success: true, data: rows });
});

/** @route POST /api/courts · Administrador · RF06 */
export const createCourt = asyncHandler(async (req, res) => {
  const c = check(validateCourt(req.body));
  const [r] = await pool.query(
    "INSERT INTO courts (name, description, status) VALUES (?, ?, ?)",
    [c.name, c.description, c.status],
  );
  await logAction(pool, {
    entity: "court",
    entityId: r.insertId,
    action: "creada",
    userId: req.user.id,
  });
  res.status(201).json({ success: true, data: { id: r.insertId, ...c } });
});

/** @route PUT /api/courts/:id · Administrador · RF06 (editar nombre/estado; nunca se borra para conservar el historial). */
export const updateCourt = asyncHandler(async (req, res) => {
  const c = check(validateCourt(req.body));
  const [r] = await pool.query(
    "UPDATE courts SET name = ?, description = ?, status = ? WHERE id = ?",
    [c.name, c.description, c.status, req.params.id],
  );
  if (!r.affectedRows) throw new AppError(404, "Cancha no encontrada");
  await logAction(pool, {
    entity: "court",
    entityId: Number(req.params.id),
    action: "editada",
    userId: req.user.id,
    detail: c,
  });
  res.json({ success: true, data: { id: Number(req.params.id), ...c } });
});

/** @route GET /api/settings ·Público (el frontend necesita horario y duración del bloque). */
export const readSettings = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await getSettings() });
});

/** @route PUT /api/settings · Administrador · RF07 */
export const updateSettings = asyncHandler(async (req, res) => {
  const s = check(validateSettings(req.body));
  for (const [key, value] of Object.entries(s)) {
    await pool.query(
      "INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)",
      [key, String(value)],
    );
  }
  res.json({ success: true, data: await getSettings() });
});

/** @route GET /api/rates · Administrador y dueño · RF08 */
export const listRates = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    "SELECT r.*, c.name AS court_name FROM rates r LEFT JOIN courts c ON c.id = r.court_id ORDER BY r.day_type, r.start_time, c.name",
  );
  res.json({ success: true, data: rows });
});

/** @route POST /api/rates · Administrador · RF08 */
export const createRate = asyncHandler(async (req, res) => {
  const r = check(validateRate(req.body));
  const [ins] = await pool.query(
    "INSERT INTO rates (court_id, day_type, start_time, end_time, price) VALUES (?, ?, ?, ?, ?)",
    [r.court_id, r.day_type, r.start_time, r.end_time, r.price],
  );
  res.status(201).json({ success: true, data: { id: ins.insertId, ...r } });
});

/** @route PUT /api/rates/:id · Administrador · RF08 (no afecta reservas ya creadas: guardan su precio). */
export const updateRate = asyncHandler(async (req, res) => {
  const r = check(validateRate(req.body));
  const [u] = await pool.query(
    "UPDATE rates SET court_id = ?, day_type = ?, start_time = ?, end_time = ?, price = ? WHERE id = ?",
    [r.court_id, r.day_type, r.start_time, r.end_time, r.price, req.params.id],
  );
  if (!u.affectedRows) throw new AppError(404, "Tarifa no encontrada");
  res.json({ success: true, data: { id: Number(req.params.id), ...r } });
});

/** @route DELETE /api/rates/:id ·Administrador */
export const deleteRate = asyncHandler(async (req, res) => {
  const [d] = await pool.query("DELETE FROM rates WHERE id = ?", [
    req.params.id,
  ]);
  if (!d.affectedRows) throw new AppError(404, "Tarifa no encontrada");
  res.json({ success: true });
});

/** @route GET /api/holidays · Público · Lista de días festivos. */
export const listHolidays = asyncHandler(async (req, res) => {
  const holidays = await loadHolidays();
  const [rows] = await pool.query(
    "SELECT id, holiday_date, name FROM holidays ORDER BY holiday_date",
  );
  res.json({ success: true, data: rows });
});

/** @route POST /api/holidays · Administrador · Agregar un día festivo. */
export const createHoliday = asyncHandler(async (req, res) => {
  const h = check(validateHoliday(req.body));
  const [r] = await pool.query(
    "INSERT INTO holidays (holiday_date, name) VALUES (?, ?)",
    [h.holiday_date, h.name],
  );
  await logAction(pool, {
    entity: "holiday",
    entityId: r.insertId,
    action: "creada",
    userId: req.user.id,
    detail: h,
  });
  res.status(201).json({ success: true, data: { id: r.insertId, ...h } });
});

/** @route DELETE /api/holidays/:id · Administrador · Eliminar un día festivo. */
export const deleteHoliday = asyncHandler(async (req, res) => {
  const [d] = await pool.query("DELETE FROM holidays WHERE id = ?", [
    req.params.id,
  ]);
  if (!d.affectedRows) throw new AppError(404, "Festivo no encontrado");
  await logAction(pool, {
    entity: "holiday",
    entityId: Number(req.params.id),
    action: "eliminada",
    userId: req.user.id,
  });
  res.json({ success: true });
});
