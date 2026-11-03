// tests/report.service.integration.test.js — Pruebas de integración de report.service
import { describe, it, expect, beforeAll, afterAll } from "jest";
import { pool } from "../src/config/db.js";
import {
  incomeReport,
  usageReport,
  statusReport,
} from "../src/services/report.service.js";
import { methodsReport } from "../src/services/report.service.js";
jest.setTimeout(20000);

const today = "2026-11-01";

async function ensureSchema() {
  const [tables] = await pool.query("SHOW TABLES LIKE 'payments'");
  if (!tables.length) {
    throw new Error(
      "Las tablas no existen. Ejecuta npm run seed:reset primero.",
    );
  }
}

async function seedMinimal() {
  // Usuario admin
  await pool.query(
    `INSERT IGNORE INTO users (id, name, email, phone, password, role, active)
     VALUES (1, 'Admin Test', 'admin@test.com', '3001111111', 'hash', 'administrador', 1)`,
  );
  // Cancha
  const [courts] = await pool.query("SELECT id FROM courts LIMIT 1");
  if (!courts.length) {
    await pool.query(
      "INSERT INTO courts (name, description, status) VALUES ('Cancha Test', 'Test', 'activa')",
    );
  }

  // Pago de prueba
  const [bookings] = await pool.query(
    "SELECT id, price_total FROM bookings LIMIT 1",
  );
  if (bookings.length) {
    await pool.query(
      `INSERT INTO payments (booking_id, amount, kind, method, created_by)
       VALUES (?, ?, 'reserva', 'efectivo', 1)`,
      [bookings[0].id, bookings[0].price_total],
    );
  }
}

describe("report.service (integración)", () => {
  beforeAll(async () => {
    try {
      await ensureSchema();
      await seedMinimal();
    } catch (e) {
      console.log(
        "⚠️  Saltando pruebas de integración report.service:",
        e.message,
      );
    }
  });

  afterAll(async () => {
    await pool.end();
  });

  it("incomeReport retorna estructura válida", async () => {
    const result = await incomeReport({ from: today, to: today });
    expect(result.from).toBe(today);
    expect(result.to).toBe(today);
    expect(Array.isArray(result.days)).toBe(true);
    expect(typeof result.total).toBe("number");
  });

  it("usageReport retorna estructura válida", async () => {
    const result = await usageReport({ from: today, to: today });
    expect(result.from).toBe(today);
    expect(Array.isArray(result.courts)).toBe(true);
    result.courts.forEach((c) => {
      expect(c).toHaveProperty("id");
      expect(c).toHaveProperty("name");
      expect(typeof c.total).toBe("number");
    });
  });

  it("statusReport retorna estructura válida", async () => {
    const result = await statusReport({ from: today, to: today });
    expect(result.from).toBe(today);
    expect(Array.isArray(result.statuses)).toBe(true);
    result.statuses.forEach((s) => {
      expect(s).toHaveProperty("status");
      expect(typeof s.count).toBe("number");
    });
  });
  it("incomeReport incluye total_bruto, total_neto y total_devoluciones", async () => {
    const r = await incomeReport({ from: today, to: today });
    expect(r).toHaveProperty("total_bruto");
    expect(r).toHaveProperty("total_neto");
    expect(r).toHaveProperty("total_devoluciones");
    expect(typeof r.total_neto).toBe("number");
  });

  it("methodsReport devuelve bruto/devoluciones/neto por método", async () => {
    const r = await methodsReport({ from: today, to: today });
    expect(Array.isArray(r.methods)).toBe(true);
    r.methods.forEach((m) => {
      expect(m).toHaveProperty("method");
      expect(m).toHaveProperty("bruto");
      expect(m).toHaveProperty("devoluciones");
      expect(m).toHaveProperty("neto");
    });
  });
});
