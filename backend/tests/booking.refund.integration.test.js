// tests/booking.refund.integration.test.js
import { pool } from "../src/config/db.js";
import {
  createBooking,
  registerPayment,
  confirmBooking,
  refundBooking,
  cancelBooking,
} from "../src/services/booking.service.js";
import { incomeReport } from "../src/services/report.service.js";

jest.setTimeout(20000);

const ADMIN = { id: 1, role: "administrador", name: "Admin" };

let courtId;
let booking;

const ensureSchema = async () => {
  const [t] = await pool.query("SHOW TABLES LIKE 'payments'");
  if (!t.length) throw new Error("Sin esquema: ejecuta npm run seed:reset");
};

const seedMinimal = async () => {
  await pool.query(
    `INSERT IGNORE INTO users (id,name,email,phone,password,role,active)
     VALUES (1,'Admin','a@t.com','3001111111','hash','administrador',1)`,
  );
  const [c] = await pool.query("SELECT id FROM courts LIMIT 1");
  if (!c.length) {
    const [r] = await pool.query(
      "INSERT INTO courts (name,description,status) VALUES ('C1','','activa')",
    );
    courtId = r.insertId;
  } else courtId = c[0].id;

  await pool.query(
    `INSERT IGNORE INTO settings (\`key\`,\`value\`) VALUES
      ('open_time','08:00:00'),('close_time','23:00:00'),('block_minutes','60'),
      ('online_hold_minutes','30'),('min_cancel_hours','2'),('business_name','T')`,
  );
  await pool.query(
    `INSERT IGNORE INTO rates (court_id,day_type,start_time,end_time,price)
     VALUES (NULL,'semana','08:00:00','17:00:00',50000)`,
  );
};

let _fechaCounter = 0;
const futureDate = () => {
  // +10 días para superar min_cancel_hours con holgura.
  // Contador para evitar que dos tests usen la misma fecha/hora y choquen
  // con los court_slots de pruebas previas.
  _fechaCounter++;
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 10);
  const h = 9 + (_fechaCounter % 14); // hora entre 09:00 y 22:00
  d.setUTCHours(h, 0, 0, 0);
  return d.toISOString().slice(0, 10);
};

describe("refundBooking (integración)", () => {
  beforeAll(async () => {
    await ensureSchema();
    await seedMinimal();

    // Guarda de seguridad: solo borrar en bases *_test
    if (!process.env.DB_NAME?.endsWith("_test")) {
      throw new Error(
        "Estas pruebas solo corren contra bases *_test. Abortando para proteger datos de producción.",
      );
    }

    // Limpia datos residuales de ejecuciones previas para aislar los tests
    await pool.query("DELETE FROM payments");
    await pool.query("DELETE FROM court_slots WHERE booking_id IS NOT NULL");
    await pool.query("DELETE FROM bookings");
  });
  afterAll(async () => {
    await pool.end();
  });

  it("crea reserva con pago y la reembolsa correctamente", async () => {
    booking = await createBooking(
      {
        court_id: courtId,
        date: futureDate(),
        start_time: "10:00:00",
        customer_name: "Refund Test",
        customer_phone: "3001234567",
        duration_blocks: 1,
      },
      ADMIN,
    );
    expect(booking.status).toBe("procesando");

    await registerPayment(
      booking.id,
      { amount: booking.price_total, kind: "reserva", method: "efectivo" },
      ADMIN,
    );
    const confirmed = await confirmBooking(booking.id, ADMIN);
    expect(confirmed.payment_status).toBe("pagado");

    const refunded = await refundBooking(
      booking.id,
      { reason: "Cliente no requiere el servicio", method: "efectivo" },
      ADMIN,
    );
    expect(refunded.status).toBe("cancelada");
    expect(refunded.cancel_reason).toMatch(/Reembolso/);
  });

  it("libera los slots de la reserva", async () => {
    const [slots] = await pool.query(
      "SELECT id FROM court_slots WHERE booking_id = ?",
      [booking.id],
    );
    expect(slots.length).toBe(0);
  });

  it("registra un movimiento kind='devolucion' en payments", async () => {
    const [rows] = await pool.query(
      "SELECT amount, kind FROM payments WHERE booking_id = ? AND kind='devolucion'",
      [booking.id],
    );
    expect(rows.length).toBe(1);
    expect(Number(rows[0].amount)).toBe(Number(booking.price_total));
  });

  it("incomeReport descuenta la devolución del total", async () => {
    // La devolución se atribuye a la fecha del pago original (zona horaria del servidor).
    // Usamos la fecha del pago registrado (CURRENT_TIMESTAMP del servidor en Bogotá).
    const [pago] = await pool.query(
      `SELECT DATE(paid_at) AS fecha_pago FROM payments
       WHERE booking_id = ? AND kind <> 'devolucion' ORDER BY paid_at LIMIT 1`,
      [booking.id],
    );
    const fechaPago = String(pago[0].fecha_pago).slice(0, 10);
    const report = await incomeReport({ from: fechaPago, to: fechaPago });
    // Hay 1 pago + 1 devolución del mismo monto → neto 0
    expect(Number(report.total_neto)).toBe(0);
    expect(Number(report.total_devoluciones)).toBe(Number(booking.price_total));
  });

  it("rechaza reembolso si no hay pagos", async () => {
    const b = await createBooking(
      {
        court_id: courtId,
        date: futureDate(),
        start_time: "11:00:00",
        customer_name: "Sin pago",
        customer_phone: "3001234567",
        duration_blocks: 1,
      },
      ADMIN,
    );
    await expect(refundBooking(b.id, { reason: "X" }, ADMIN)).rejects.toThrow(
      /No hay pagos/,
    );
  });

  it("rechaza reembolso si está fuera de la ventana", async () => {
    const t = new Date();
    t.setUTCDate(t.getUTCDate() + 1); // mañana (< 2h? en realidad > 2h, pero…)
    // Creamos con hora ya pasada para forzar la ventana
    const b = await createBooking(
      {
        court_id: courtId,
        date: futureDate(),
        start_time: "12:00:00",
        customer_name: "Tarde",
        customer_phone: "3001234567",
        duration_blocks: 1,
      },
      ADMIN,
    );
    await registerPayment(
      b.id,
      { amount: b.price_total, kind: "reserva", method: "efectivo" },
      ADMIN,
    );
    await confirmBooking(b.id, ADMIN);
    // La ventana ya pasó solo si se intenta cerca del inicio; aquí usamos una
    // reserva para hoy a muy corto plazo → forzamos el caso manualmente
    await pool.query(
      "UPDATE bookings SET date=CURDATE(), start_time='00:01:00' WHERE id=?",
      [b.id],
    );
    await expect(refundBooking(b.id, { reason: "X" }, ADMIN)).rejects.toThrow(
      /anticipación/,
    );
    // Con el nuevo flujo, no se puede cancelar una reserva que tiene pagos
    // sin antes procesar el reembolso.
    await expect(
      cancelBooking(b.id, { reason: "cleanup" }, ADMIN),
    ).rejects.toThrow(/pagos/);
  });
});
