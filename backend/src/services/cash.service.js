// backend/src/services/cash.service.js
// Arqueo de caja diaria y flujo de caja para reservas de cancha por tiempo.
// Concilia lo registrado en el sistema vs lo físico en caja.
import { pool, withTransaction } from "../config/db.js";
import { AppError } from "../utils/AppError.js";
import { logAction } from "../utils/audit.js";
import { nowBogota } from "../utils/time.js";

/** Obtiene la caja abierta para una fecha (por defecto hoy). */
export const getOpenCash = async (openDate = null) => {
  const date = openDate || nowBogota().date;
  const [rows] = await pool.query(
    `SELECT cd.*, u.name AS opened_by_name
       FROM cash_drawer cd
       LEFT JOIN users u ON u.id = cd.opened_by
      WHERE cd.open_date = ?
      ORDER BY cd.id DESC
      LIMIT 1`,
    [date],
  );
  return rows[0] || null;
};

/** Abre la caja del día con un monto inicial. */
export const openCash = async ({ open_amount, note }, user) => {
  const date = nowBogota().date;
  const amount = Number(open_amount || 0);

  if (amount < 0) throw new AppError(400, "Monto inicial inválido");

  // Verificar que no exista ya una caja abierta para hoy
  const existing = await getOpenCash(date);
  if (existing && existing.status === "abierta")
    throw new AppError(409, "Ya existe una caja abierta para hoy");

  return withTransaction(async (conn) => {
    const [r] = await conn.query(
      `INSERT INTO cash_drawer (open_date, open_amount, opened_by, status, note)
       VALUES (?, ?, ?, 'abierta', ?)`,
      [date, amount, user.id, note ?? null],
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

/** Cierra la caja del día conciliando con el sistema. */
export const closeCash = async ({ close_amount, note }, user) => {
  const date = nowBogota().date;
  const closeAmt = Number(close_amount || 0);

  if (closeAmt < 0) throw new AppError(400, "Monto de cierre inválido");

  return withTransaction(async (conn) => {
    const [rows] = await conn.query(
      "SELECT id, open_amount, status FROM cash_drawer WHERE open_date = ? AND status = 'abierta' ORDER BY id DESC LIMIT 1",
      [date],
    );
    if (!rows[0]) throw new AppError(409, "No hay caja abierta para cerrar hoy");

    const drawerId = rows[0].id;
    const openAmt = Number(rows[0].open_amount);

    // Ingresos del sistema (pagos netos = reservas + adicionales - devoluciones) del día
    const [[incomeRow]] = await conn.query(
      `SELECT COALESCE(SUM(CASE WHEN kind = 'devolucion' THEN -amount ELSE amount END), 0) AS system_income
         FROM payments
        WHERE DATE(paid_at) = ?`,
      [date],
    );
    const systemIncome = Number(incomeRow.system_income || 0);

    // Egresos del sistema del día
    const [[expenseRow]] = await conn.query(
      `SELECT COALESCE(SUM(amount), 0) AS system_expense
         FROM expenses
        WHERE DATE(paid_at) = ?`,
      [date],
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
        nowBogota().datetime,
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
        open_date: date,
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
      open_date: date,
      open_amount: openAmt,
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
