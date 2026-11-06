// tests/booking.service.integration.test.js — Pruebas de integración de booking.service
// Requiere MySQL con base de datos cancha_control_test creada y esquema aplicado.
import { pool } from "../src/config/db.js";
import {
  createBooking,
  cancelBooking,
  confirmBooking,
  startTimer,
  finishTimer,
  registerPayment,
} from "../src/services/booking.service.js";
import { loadHolidays } from "../src/services/schedule.service.js";

jest.setTimeout(20000);

const futureDate = (offset = 1) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};

const ADMIN_USER = { id: 1, role: "administrador", name: "Admin Test" };
const CLIENT_USER = { id: 2, role: "cliente", name: "Cliente Test" };

let testCourtId;
let testBooking; // ← NUEVO: guardamos el objeto completo

async function ensureSchema() {
  const [tables] = await pool.query("SHOW TABLES LIKE 'bookings'");
  if (!tables.length) {
    throw new Error(
      "Las tablas no existen. Ejecuta npm run seed:reset primero.",
    );
  }
}

async function seedMinimal() {
  await pool.query(
    `INSERT IGNORE INTO users (id, name, email, phone, password, role, active)
     VALUES (1, 'Admin Test', 'admin@test.com', '3001111111', 'hash', 'administrador', 1)`,
  );
  await pool.query(
    `INSERT IGNORE INTO users (id, name, email, phone, password, role, active)
     VALUES (2, 'Cliente Test', 'cliente@test.com', '3002222222', 'hash', 'cliente', 1)`,
  );

  const [courts] = await pool.query("SELECT id FROM courts LIMIT 1");
  if (!courts.length) {
    const [r] = await pool.query(
      "INSERT INTO courts (name, description, status) VALUES ('Cancha Test', 'Test', 'activa')",
    );
    testCourtId = r.insertId;
  } else {
    testCourtId = courts[0].id;
  }

  await pool.query(
    `INSERT IGNORE INTO settings (\`key\`, \`value\`) VALUES
     ('open_time','08:00:00'),('close_time','23:00:00'),('block_minutes','60'),
     ('online_hold_minutes','30'),('min_cancel_hours','2'),('business_name','Test')`,
  );

  await pool.query(
    `INSERT IGNORE INTO rates (court_id, day_type, start_time, end_time, price)
     VALUES (NULL, 'semana', '08:00:00', '17:00:00', 50000)`,
  );
}

describe("booking.service (integración)", () => {
  beforeAll(async () => {
    try {
      await ensureSchema();
      await seedMinimal();
    } catch (e) {
      console.log(
        "⚠️  Saltando pruebas de integración booking.service:",
        e.message,
      );
    }
  });

  afterAll(async () => {
    await pool.end();
  });

  it("debe cargar festivos (array vacío o con datos)", async () => {
    const holidays = await loadHolidays();
    expect(Array.isArray(holidays)).toBe(true);
  });

  // ← FIX: se invirtió el orden de argumentos (data, user) y se espera "procesando"
  it("crea una reserva como admin (procesando)", async () => {
    testBooking = await createBooking(
      {
        court_id: testCourtId,
        date: futureDate(2),
        start_time: "10:00:00",
        customer_name: "Cliente Reserva",
        customer_phone: "3009999999",
        duration_blocks: 1,
      },
      ADMIN_USER,
    );
    expect(testBooking.status).toBe("procesando");
    expect(testBooking.code).toBeDefined();
    expect(testBooking.price_total).toBeGreaterThan(0);
    expect(testBooking.payment_status).toBe("pendiente");
  });

  // ← NUEVO: no permite aprobar sin pago
  it("no permite aprobar sin pago", async () => {
    await expect(confirmBooking(testBooking.id, ADMIN_USER)).rejects.toThrow(
      /pago/i,
    );
  });

  // ← NUEVO: registra pago y luego permite aprobar
  it("registra pago y permite aprobar", async () => {
    await registerPayment(
      testBooking.id,
      {
        amount: testBooking.price_total,
        kind: "reserva",
        method: "efectivo",
      },
      ADMIN_USER,
    );
    const confirmed = await confirmBooking(testBooking.id, ADMIN_USER);
    expect(confirmed.status).toBe("ocupada");
    expect(confirmed.expires_at).toBeNull();
    expect(confirmed.payment_status).toBe("pagado");
  });

  it("crea una reserva como cliente (procesando)", async () => {
    const b = await createBooking(
      {
        court_id: testCourtId,
        date: futureDate(2),
        start_time: "11:00:00",
        customer_name: "Cliente Online",
        customer_phone: "3008888888",
        duration_blocks: 1,
      },
      CLIENT_USER,
    );
    expect(b.status).toBe("procesando");
    expect(b.expires_at).not.toBeNull();
  });

  it("inicia cronómetro (ocupada → en_curso)", async () => {
    const started = await startTimer(
      testBooking.id,
      { extra_minutes: 0 },
      ADMIN_USER,
    );
    expect(started.status).toBe("en_curso");
    expect(started.timer_started_at).not.toBeNull();
    expect(started.timer_ends_at).not.toBeNull();
  });

  it("no permite iniciar cronómetro dos veces", async () => {
    await expect(
      startTimer(testBooking.id, { extra_minutes: 0 }, ADMIN_USER),
    ).rejects.toThrow(/ya fue iniciado/);
  });

  it("finaliza turno (en_curso → finalizada)", async () => {
    const finished = await finishTimer(testBooking.id, ADMIN_USER);
    expect(finished.status).toBe("finalizada");
    expect(finished.finished_at).not.toBeNull();
  });

  it("registra un pago válido", async () => {
    const b = await createBooking(
      {
        court_id: testCourtId,
        date: futureDate(4),
        start_time: "14:00:00",
        customer_name: "Pago Test",
        customer_phone: "3006666666",
        duration_blocks: 1,
      },
      ADMIN_USER,
    );
    const payment = await registerPayment(
      b.id,
      { amount: b.price_total, kind: "reserva", method: "efectivo" },
      ADMIN_USER,
    );
    expect(payment.booking.payment_status).toBe("pagado");
  });

  it("rechaza pago que excede el saldo", async () => {
    const b = await createBooking(
      {
        court_id: testCourtId,
        date: futureDate(5),
        start_time: "15:00:00",
        customer_name: "Pago Exceso",
        customer_phone: "3005555555",
        duration_blocks: 1,
      },
      ADMIN_USER,
    );
    await expect(
      registerPayment(
        b.id,
        {
          amount: b.price_total + 1000,
          kind: "reserva",
          method: "efectivo",
        },
        ADMIN_USER,
      ),
    ).rejects.toThrow(/excede/);
  });

  it("cancela una reserva", async () => {
    const b = await createBooking(
      {
        court_id: testCourtId,
        date: futureDate(6),
        start_time: "16:00:00",
        customer_name: "Cancelar Test",
        customer_phone: "3004444444",
        duration_blocks: 1,
      },
      ADMIN_USER,
    );
    const cancelled = await cancelBooking(
      b.id,
      { reason: "Prueba" },
      ADMIN_USER,
    );
    expect(cancelled.status).toBe("cancelada");
    expect(cancelled.cancel_reason).toBe("Prueba");
  });
});
