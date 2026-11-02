// backend/src/models/User.js
import { pool } from "../config/db.js";
import bcrypt from "bcryptjs";
import { AppError } from "../utils/AppError.js";
import { signToken } from "../services/token.service.js";
import { nowBogota, addMinutes } from "../utils/time.js";
import { MAX_LOGIN_ATTEMPTS, LOCK_MINUTES } from "../config/constants.js";

const PUBLIC_FIELDS = "id, name, email, phone, role, active, created_at";

export const User = {
  async create({
    name,
    email,
    phone = null,
    password,
    role = "cliente",
    acceptTerms = false,
  }) {
    const [existing] = await pool.query(
      "SELECT id FROM users WHERE email = ?",
      [email],
    );
    if (existing.length > 0)
      throw new AppError(409, "El email ya está registrado");

    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      "INSERT INTO users (name, email, phone, password, role, terms_accepted_at) VALUES (?, ?, ?, ?, ?, ?)",
      [
        name,
        email,
        phone,
        hash,
        role,
        acceptTerms ? nowBogota().datetime : null,
      ],
    );
    return this.findById(result.insertId);
  },

  async findByEmail(email) {
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    return rows[0] || null;
  },

  async findById(id) {
    const [rows] = await pool.query(
      `SELECT ${PUBLIC_FIELDS} FROM users WHERE id = ?`,
      [id],
    );
    return rows[0] || null;
  },

  async findAll({ page = 1, limit = 50, q = "", role = "" } = {}) {
    const p = Math.max(1, Number(page) || 1);
    const l = Math.min(100, Math.max(1, Number(limit) || 50));
    const offset = (p - 1) * l;

    const where = [];
    const params = [];

    if (q && String(q).trim()) {
      where.push("(name LIKE ? OR email LIKE ? OR phone LIKE ?)");
      const like = `%${String(q).trim()}%`;
      params.push(like, like, like);
    }
    if (role && String(role).trim()) {
      where.push("role = ?");
      params.push(String(role).trim());
    }

    const whereSql = where.length ? ` WHERE ${where.join(" AND ")}` : "";

    const [rows] = await pool.query(
      `SELECT ${PUBLIC_FIELDS} FROM users${whereSql}
       ORDER BY
         CASE role
           WHEN 'administrador' THEN 1
           WHEN 'dueno' THEN 2
           WHEN 'vigilancia' THEN 3
           WHEN 'cliente' THEN 4
           ELSE 5
         END,
         created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, l, offset],
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM users${whereSql}`,
      params,
    );

    return {
      data: rows,
      total: Number(total),
      page: p,
      limit: l,
      totalPages: Math.ceil(Number(total) / l),
    };
  },

  async update(id, { name, phone, role, active }) {
    const [dup] = await pool.query("SELECT id FROM users WHERE id = ?", [id]);
    if (!dup.length) throw new AppError(404, "Usuario no encontrado");
    await pool.query(
      "UPDATE users SET name = ?, phone = ?, role = ?, active = ? WHERE id = ?",
      [name, phone, role, active ? 1 : 0, id],
    );
    return this.findById(id);
  },

  async changePassword(id, currentPassword, newPassword) {
    const [rows] = await pool.query("SELECT password FROM users WHERE id = ?", [
      id,
    ]);
    if (
      !rows[0] ||
      !(await bcrypt.compare(currentPassword, rows[0].password))
    ) {
      throw new AppError(400, "La contraseña actual no es correcta");
    }
    await pool.query("UPDATE users SET password = ? WHERE id = ?", [
      await bcrypt.hash(newPassword, 10),
      id,
    ]);
  },

  /** Cuenta cuántos administradores activos hay (para no dejar el sistema sin admin). */
  async countActiveAdmins() {
    const [[{ n }]] = await pool.query(
      "SELECT COUNT(*) AS n FROM users WHERE role = 'administrador' AND active = 1",
    );
    return Number(n);
  },

  /** Reservas del cliente que impiden borrar su cuenta (activas o pendientes). */
  async countActiveBookings(id) {
    const [[{ n }]] = await pool.query(
      `SELECT COUNT(*) AS n FROM bookings
        WHERE customer_id = ?
          AND status IN ('procesando','ocupada','en_curso')`,
      [id],
    );
    return Number(n);
  },

  /**
   * Eliminación suave:
   *  - bloquea el login (active = 0)
   *  - libera el email (lo reemplaza por uno sintético único)
   *  - borra PII (nombre y teléfono)
   *  - invalida el hash de la contraseña
   * Mantiene el `id` para no romper FKs de reservas/pagos históricos.
   */
  async anonymize(id) {
    const stamp = Date.now();
    const scrambled = await bcrypt.hash(`deleted-${id}-${stamp}`, 10);
    await pool.query(
      `UPDATE users
         SET active = 0,
             name = 'Cuenta eliminada',
             email = CONCAT('deleted_', id, '_', ?, '@deleted.local'),
             phone = NULL,
             password = ?,
             failed_attempts = 0,
             locked_until = NULL
       WHERE id = ?`,
      [stamp, scrambled, id],
    );
  },

  isLocked: (user) =>
    Boolean(user.locked_until && user.locked_until > nowBogota().datetime),

  async registerFailure(user) {
    const attempts = user.failed_attempts + 1;
    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      await pool.query(
        "UPDATE users SET failed_attempts = 0, locked_until = ? WHERE id = ?",
        [addMinutes(nowBogota().datetime, LOCK_MINUTES), user.id],
      );
    } else {
      await pool.query("UPDATE users SET failed_attempts = ? WHERE id = ?", [
        attempts,
        user.id,
      ]);
    }
  },
  async resetFailures(id) {
    await pool.query(
      "UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?",
      [id],
    );
  },

  matchPassword: (entered, hash) => bcrypt.compare(entered, hash),
  generateToken: (user) => signToken({ id: user.id, role: user.role }),
};

export default User;
