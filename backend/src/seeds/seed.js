// backend/src/seeds/seed.js
// Uso:
//   npm run seed:reset   ← BORRA y recrea la BD (para desarrollo)
//   npm run seed         ← solo inserta si las tablas están vacías
import "dotenv/config";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RESET = process.argv.includes("--reset");

const {
  DB_HOST = "localhost",
  DB_PORT = "3306",
  DB_USER = "root",
  DB_PASSWORD = "",
  DB_NAME = "cancha_control",
} = process.env;

const HASH = (p) => bcrypt.hash(p, 10);

const USERS = [
  {
    name: "Administrador",
    email: "admin@canchacontrol.com",
    phone: "3001111111",
    role: "administrador",
    password: "Admin123*",
  },
  {
    name: "Dueño Cancha",
    email: "dueno@canchacontrol.com",
    phone: "3002222222",
    role: "dueno",
    password: "Dueno123*",
  },
  {
    name: "Vigilancia",
    email: "vigilancia@canchacontrol.com",
    phone: "3003333333",
    role: "vigilancia",
    password: "Vigia123*",
  },
  {
    name: "Cliente Demo",
    email: "cliente@canchacontrol.com",
    phone: "3004444444",
    role: "cliente",
    password: "Cliente123*",
  },
];

const COURTS = [
  {
    name: "Cancha 1",
    description: "Cancha sintética 5 vs 5",
    status: "activa",
  },
  {
    name: "Cancha 2",
    description: "Cancha sintética 5 vs 5",
    status: "activa",
  },
  {
    name: "Cancha 3",
    description: "Cancha sintética 7 vs 7",
    status: "activa",
  },
];

const SETTINGS = {
  open_time: "08:00:00",
  close_time: "23:00:00",
  block_minutes: 60,
  online_hold_minutes: 30,
  min_cancel_hours: 2,
  business_name: "CanchaControl",
};

const HOLIDAYS = [
  { holiday_date: "2026-12-25", name: "Navidad" },
  { holiday_date: "2027-01-01", name: "Año Nuevo" },
  { holiday_date: "2027-05-01", name: "Día del Trabajo" },
  { holiday_date: "2027-07-20", name: "Día de la Independencia" },
  { holiday_date: "2027-12-25", name: "Navidad" },
];

// Tarifa base: 60.000 COP por hora en cancha individual (semana)
// 80.000 COP por hora en fin de semana. Cancha 3 (7v7) más cara.
const RATES = [
  {
    court_id: 1,
    day_type: "semana",
    start_time: "08:00:00",
    end_time: "18:00:00",
    price: 50_000,
  },
  {
    court_id: 1,
    day_type: "semana",
    start_time: "18:00:00",
    end_time: "23:00:00",
    price: 60_000,
  },
  {
    court_id: 1,
    day_type: "finde",
    start_time: "08:00:00",
    end_time: "23:00:00",
    price: 80_000,
  },
  {
    court_id: 2,
    day_type: "semana",
    start_time: "08:00:00",
    end_time: "18:00:00",
    price: 50_000,
  },
  {
    court_id: 2,
    day_type: "semana",
    start_time: "18:00:00",
    end_time: "23:00:00",
    price: 60_000,
  },
  {
    court_id: 2,
    day_type: "finde",
    start_time: "08:00:00",
    end_time: "23:00:00",
    price: 80_000,
  },
  {
    court_id: 3,
    day_type: "semana",
    start_time: "08:00:00",
    end_time: "23:00:00",
    price: 90_000,
  },
  {
    court_id: 3,
    day_type: "finde",
    start_time: "08:00:00",
    end_time: "23:00:00",
    price: 120_000,
  },
];

async function run() {
  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
    multipleStatements: true,
  });

  try {
    if (RESET) {
      console.log("⚠️  --reset: borrando base de datos…");
      await conn.query(`DROP DATABASE IF EXISTS \`${DB_NAME}\``);
    }
    console.log("📄 Aplicando esquema…");
    const sql = readFileSync(
      resolve(__dirname, "../config/schema.sql"),
      "utf8",
    );
    await conn.query(sql);
    await conn.query(`USE \`${DB_NAME}\``);

    // ¿ya hay datos?
    const [[{ n }]] = await conn.query("SELECT COUNT(*) AS n FROM users");
    if (!RESET && n > 0) {
      console.log(
        "ℹ️  La base ya tiene usuarios. Usa --reset para recrear todo.",
      );
      return;
    }

    console.log("👥 Insertando usuarios…");
    for (const u of USERS) {
      await conn.query(
        `INSERT INTO users (name, email, phone, password, role, active, terms_accepted_at)
         VALUES (?, ?, ?, ?, ?, 1, NOW())`,
        [u.name, u.email, u.phone, await HASH(u.password), u.role],
      );
    }

    console.log("🏟️  Insertando canchas…");
    for (const c of COURTS) {
      await conn.query(
        "INSERT INTO courts (name, description, status) VALUES (?, ?, ?)",
        [c.name, c.description, c.status],
      );
    }

    console.log("⚙️  Insertando configuración…");
    for (const [key, value] of Object.entries(SETTINGS)) {
      await conn.query("INSERT INTO settings (`key`, `value`) VALUES (?, ?)", [
        key,
        String(value),
      ]);
    }

    console.log("💵 Insertando tarifas…");
    for (const r of RATES) {
      await conn.query(
        `INSERT INTO rates (court_id, day_type, start_time, end_time, price)
         VALUES (?, ?, ?, ?, ?)`,
        [r.court_id, r.day_type, r.start_time, r.end_time, r.price],
      );
    }

    console.log("🎄 Insertando días festivos…");
    for (const h of HOLIDAYS) {
      await conn.query(
        `INSERT IGNORE INTO holidays (holiday_date, name) VALUES (?, ?)`,
        [h.holiday_date, h.name],
      );
    }

    console.log("\n✅ Seed completado. Usuarios:");
    console.table(USERS.map(({ password, ...u }) => ({ ...u, password })));
  } finally {
    await conn.end();
  }
}

run().catch((e) => {
  console.error("❌ Seed falló:", e);
  process.exit(1);
});
