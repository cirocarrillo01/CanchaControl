// backend/src/models/User.js
import { pool } from "../config/db.js";
import bcrypt from "bcryptjs";
import { AppError } from "../utils/AppError.js";
import { signToken } from "../services/token.service.js";
import { nowBogota, addMinutes } from "../utils/time.js";
import { MAX_LOGIN_ATTEMPTS, LOCK_MINUTES } from "../config/constants.js";

const PUBLIC_FIELDS = "id, name, email, phone, role, active, created_at";

/** Modelo de Usuario: encapsula todas las consultas SQL de la tabla users. */
export const User = {
  /** RF05 / RF04: crea un usuario (los clientes se auto-registran; el admin crea cualquier rol). */
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

    const hash = await bcrypt.hash(password, 10); // RNF05: nunca se guarda en texto plano
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

  /** Incluye hash y contadores de bloqueo; solo para el login. */
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

  async findAll({ page = 1, limit = 50 } = {}) {
    const p = Math.max(1, page);
    const l = Math.min(100, Math.max(1, limit));
    const offset = (p - 1) * l;
    const [rows] = await pool.query(
      `SELECT ${PUBLIC_FIELDS} FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [l, offset],
    );
    const [[{ total }]] = await pool.query(
      "SELECT COUNT(*) AS total FROM users",
    );
    return {
      data: rows,
      total: Number(total),
      page: p,
      limit: l,
      totalPages: Math.ceil(Number(total) / l),
    };
  },

  /** RF04: edita datos/rol y permite desactivar sin borrar el historial. */
  async update(id, { name, phone, role, active }) {
    const [dup] = await pool.query("SELECT id FROM users WHERE id = ?", [id]);
    if (!dup.length) throw new AppError(404, "Usuario no encontrado");
    await pool.query(
      "UPDATE users SET name = ?, phone = ?, role = ?, active = ? WHERE id = ?",
      [name, phone, role, active ? 1 : 0, id],
    );
    return this.findById(id);
  },

  /** RF03: cambio de contraseña (verifica la actual antes). */
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

  /** RNF06: ¿la cuenta está bloqueada temporalmente? */
  isLocked: (user) =>
    Boolean(user.locked_until && user.locked_until > nowBogota().datetime),

  /** RNF06: cuenta intentos fallidos y bloquea al llegar al máximo. */
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
