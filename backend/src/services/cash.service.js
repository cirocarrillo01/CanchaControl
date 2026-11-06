// backend/src/services/cash.service.js
// Arqueo de caja diaria y flujo de caja para reservas de cancha por tiempo.
// Concilia lo registrado en el sistema vs lo físico en caja.
import { pool, withTransaction } from "../config/db.js";
import { AppError } from "../utils/AppError.js";
import { logAction } from "../utils/audit.js";
import { nowBogota } from "../utils/time.js";

/** Obtiene el estado actual de la caja (la última registrada, abierta o cerrada). */
export const getOpenCash = async () => {
  const [rows] = await pool.query(
    `SELECT cd.*, uo.name AS opened_by_name, uc.name AS closed_by_name
       FROM cash_drawer cd
       LEFT JOIN users uo ON uo.id = cd.opened_by
       LEFT JOIN users uc ON uc.id = cd.closed_by
      ORDER BY cd.id DESC
      LIMIT 1`,
  );
  return rows[0] || null;
};

/** Obtiene el historial de cierres de caja. */
export const getCashHistory = async ({ limit = 10, offset = 0 } = {}) => {
  const [rows] = await pool.query(
    `SELECT cd.*, uo.name AS opened_by_name, uc.name AS closed_by_name
       FROM cash_drawer cd
       LEFT JOIN users uo ON uo.id = cd.opened_by
       LEFT JOIN users uc ON uc.id = cd.closed_by
      ORDER BY cd.open_date DESC, cd.id DESC
      LIMIT ? OFFSET ?`,
    [Number(limit), Number(offset)],
  );
  const [[{ total }]] = await pool.query("SELECT COUNT(*) AS total FROM cash_drawer");
  return { data: rows, total, totalPages: Math.ceil(total / limit) };
};

/** Abre la caja del día con un monto inicial. */
export const openCash = async ({ open_amount, note }, user) => {
  const date = nowBogota().date;
  const amount = Number(open_amount || 0);

  if (amount < 0) throw new AppError(400, "Monto inicial inválido");

  // Verificar que no exista ya una caja ABIERTA (sin importar fecha)
  const [rows] = await pool.query(
    "SELECT id FROM cash_drawer WHERE status = 'abierta' LIMIT 1"
  );
  if (rows[0])
    throw new AppError(409, "Ya existe una caja abierta. Debe cerrarla antes de iniciar un nuevo turno.");

  return withTransaction(async (conn) => {
    const [r] = await conn.query(
      `INSERT INTO cash_drawer (open_date, open_amount, opened_by, status, note, open_at)
       VALUES (?, ?, ?, 'abierta', ?, ?)`,
      [date, amount, user.id, note ?? null, nowBogota().datetime],
    );

    await logAction(conn, {
      entity: "cash_drawer",
      entityId: r.insertId,
      action: "apertura",
      userId: user.id,
      detail: { open_date: date, open_amount: amount, note },
    });

    return { id: r.insertId, open_date: date, open_amount: amount, status: "abierta" };
  });
};

/** Cierra la caja conciliando con el sistema. */
export const closeCash = async ({ close_amount, note, close_at }, user) => {
  const closeAmt = Number(close_amount || 0);

  if (closeAmt < 0) throw new AppError(400, "Monto de cierre inválido");

  return withTransaction(async (conn) => {
    const [rows] = await conn.query(
      "SELECT id, open_amount, status, open_at FROM cash_drawer WHERE status = 'abierta' ORDER BY id DESC LIMIT 1",
    );
    if (!rows[0]) throw new AppError(404, "No hay caja abierta para cerrar");

    const drawer = rows[0];
    const drawerId = drawer.id;
    const openAmt = Number(drawer.open_amount);
    const endTime = close_at || nowBogota().datetime;

    // Ingresos del sistema (pagos netos) desde la apertura hasta el momento del cierre
    const [[incomeRow]] = await conn.query(
      `SELECT COALESCE(SUM(CASE WHEN kind = 'devolucion' THEN -amount ELSE amount END), 0) AS system_income
         FROM payments
        WHERE paid_at BETWEEN ? AND ?`,
      [drawer.open_at, endTime],
    );
    const systemIncome = Number(incomeRow.system_income || 0);

    // Egresos del sistema desde la apertura hasta el momento del cierre
    const [[expenseRow]] = await conn.query(
      `SELECT COALESCE(SUM(amount), 0) AS system_expense
         FROM expenses
        WHERE expense_date BETWEEN ? AND ?`,
      [drawer.open_at, endTime],
    );
    const systemExpense = Number(expenseRow.system_expense || 0);

    const expectedCash = openAmt + systemIncome - systemExpense;
    const difference = closeAmt - expectedCash;

    await conn.query(
      `UPDATE cash_drawer
         SET status = 'cerrada',
             close_amount = ?,
             close_at = ?,
             closed_by = ?,
             system_income = ?,
             system_expense = ?,
             expected_cash = ?,
             difference = ?,
             note = ?
       WHERE id = ?`,
      [
        closeAmt,
        endTime,
        user.id,
        systemIncome,
        systemExpense,
        expectedCash,
        difference,
        note ?? null,
        drawerId,
      ],
    );

    await logAction(conn, {
      entity: "cash_drawer",
      entityId: drawerId,
      action: "cierre",
      userId: user.id,
      detail: {
        open_amount: openAmt,
        close_amount: closeAmt,
        system_income: systemIncome,
        system_expense: systemExpense,
        expected_cash: expectedCash,
        difference: difference,
        note,
      },
    });

    return {
      id: drawerId,
      close_amount: closeAmt,
      system_income: systemIncome,
      system_expense: systemExpense,
      expected_cash: expectedCash,
      difference: difference,
      status: "cerrada",
    };
  });
};

/** Flujo de caja por rango de fechas (ingresos - egresos). */
export const cashFlow = async ({ from, to } = {}) => {
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

  const [[income]] = await pool.query(
    `SELECT COALESCE(SUM(CASE WHEN kind = 'devolucion' THEN -amount ELSE amount END), 0) AS total_income
       FROM payments${whereSql}`,
    params,
  );

  const [[expense]] = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS total_expense
       FROM expenses${whereSql}`,
    params,
  );

  const totalIncome = Number(income.total_income || 0);
  const totalExpense = Number(expense.total_expense || 0);

  return {
    from: from || null,
    to: to || null,
    total_income: totalIncome,
    total_expense: totalExpense,
    net_profit: totalIncome - totalExpense,
  };
};
