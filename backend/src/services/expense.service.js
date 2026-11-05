// backend/src/services/expense.service.js
// Gestión de gastos/egresos operativos del establecimiento.
// Solo reservas de cancha por tiempo. Sin pasarela de pago, sin facturación, sin inventario.
import { pool, withTransaction } from "../config/db.js";
import { AppError } from "../utils/AppError.js";
import { logAction } from "../utils/audit.js";
import { nowBogota } from "../utils/time.js";

const EXPENSE_CATEGORIES = [
  "servicios_publicos",
  "mantenimiento",
  "limpieza",
  "nomina",
  "marketing",
  "productos",
  "otros",
];

const EXPENSE_METHODS = ["efectivo", "transferencia", "tarjeta"];

export const listExpenses = async ({ from, to, category, method, page = 1, limit = 50 }) => {
  const p = Math.max(1, Number(page) || 1);
  const l = Math.min(100, Math.max(1, Number(limit) || 50));
  const offset = (p - 1) * l;

  const where = [];
  const params = [];

  if (from) {
    where.push("DATE(paid_at) >= ?");
    params.push(from);
  }
  if (to) {
    where.push("DATE(paid_at) <= ?");
    params.push(to);
  }
  if (category && EXPENSE_CATEGORIES.includes(category)) {
    where.push("category = ?");
    params.push(category);
  }
  if (method && EXPENSE_METHODS.includes(method)) {
    where.push("method = ?");
    params.push(method);
  }

  const whereSql = where.length ? ` WHERE ${where.join(" AND ")}` : "";

  const [rows] = await pool.query(
    `SELECT e.*, u.name AS created_by_name
       FROM expenses e
       LEFT JOIN users u ON u.id = e.created_by
      ${whereSql}
      ORDER BY e.paid_at DESC, e.id DESC
      LIMIT ? OFFSET ?`,
    [...params, l, offset],
  );

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM expenses${whereSql}`,
    params,
  );

  return {
    data: rows,
    total: Number(total),
    page: p,
    limit: l,
    totalPages: Math.ceil(Number(total) / l),
  };
};

export const expenseSummary = async ({ from, to } = {}) => {
  const where = [];
  const params = [];

  if (from) {
    where.push("DATE(paid_at) >= ?");
    params.push(from);
  }
  if (to) {
    where.push("DATE(paid_at) <= ?");
    params.push(to);
  }

  const whereSql = where.length ? ` WHERE ${where.join(" AND ")}` : "";

  const [rows] = await pool.query(
    `SELECT category,
            method,
            SUM(amount) AS total,
            COUNT(*) AS count
       FROM expenses${whereSql}
       GROUP BY category, method
       ORDER BY total DESC`,
    params,
  );

  const [[{ total_amount, total_count }]] = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS total_amount, COUNT(*) AS total_count
       FROM expenses${whereSql}`,
    params,
  );

  return {
    from: from || null,
    to: to || null,
    total_amount: Number(total_amount || 0),
    total_count: Number(total_count || 0),
    breakdown: rows,
  };
};

export const createExpense = async (data, user) => {
  const { category, amount, method = "efectivo", note, paid_at } = data;

  if (!category || !EXPENSE_CATEGORIES.includes(category))
    throw new AppError(400, "Categoría de gasto inválida");
  if (!amount || Number(amount) <= 0)
    throw new AppError(400, "Monto inválido");
  if (!method || !EXPENSE_METHODS.includes(method))
    throw new AppError(400, "Método de pago inválido");

  const paidAt = paid_at || nowBogota().datetime;

  return withTransaction(async (conn) => {
    const [r] = await conn.query(
      `INSERT INTO expenses (category, amount, method, note, paid_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [category, Number(amount), method, note ?? null, paidAt, user.id],
    );

    await logAction(conn, {
      entity: "expense",
      entityId: r.insertId,
      action: "creado",
      userId: user.id,
      detail: { category, amount: Number(amount), method, paid_at: paidAt },
    });

    return { id: r.insertId, category, amount: Number(amount), method, note, paid_at: paidAt };
  });
};

export const updateExpense = async (id, data, user) => {
  const { category, amount, method, note, paid_at } = data;

  return withTransaction(async (conn) => {
    const [[existing]] = await conn.query(
      "SELECT id FROM expenses WHERE id = ?",
      [id],
    );
    if (!existing) throw new AppError(404, "Gasto no encontrado");

    const updates = [];
    const params = [];

    if (category !== undefined) {
      if (!EXPENSE_CATEGORIES.includes(category))
        throw new AppError(400, "Categoría de gasto inválida");
      updates.push("category = ?");
      params.push(category);
    }
    if (amount !== undefined) {
      if (!amount || Number(amount) <= 0)
        throw new AppError(400, "Monto inválido");
      updates.push("amount = ?");
      params.push(Number(amount));
    }
    if (method !== undefined) {
      if (!EXPENSE_METHODS.includes(method))
        throw new AppError(400, "Método de pago inválido");
      updates.push("method = ?");
      params.push(method);
    }
    if (note !== undefined) {
      updates.push("note = ?");
      params.push(note ?? null);
    }
    if (paid_at !== undefined) {
      updates.push("paid_at = ?");
      params.push(paid_at);
    }

    if (updates.length === 0)
      throw new AppError(400, "No hay campos para actualizar");

    params.push(id);
    await conn.query(
      `UPDATE expenses SET ${updates.join(", ")} WHERE id = ?`,
      params,
    );

    await logAction(conn, {
      entity: "expense",
      entityId: Number(id),
      action: "actualizado",
      userId: user.id,
      detail: data,
    });

    return { id: Number(id), ...data };
  });
};

export const deleteExpense = async (id, user) => {
  return withTransaction(async (conn) => {
    const [[existing]] = await conn.query(
      "SELECT id FROM expenses WHERE id = ?",
      [id],
    );
    if (!existing) throw new AppError(404, "Gasto no encontrado");

    await conn.query("DELETE FROM expenses WHERE id = ?", [id]);

    await logAction(conn, {
      entity: "expense",
      entityId: Number(id),
      action: "eliminado",
      userId: user.id,
      detail: { expense_id: id },
    });

    return { removed: true };
  });
};