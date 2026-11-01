// backend/scripts/backup.js
// Script de copia de seguridad de la base de datos CanchaControl.
// Uso: node scripts/backup.js [directorio_destino]
//
// Exporta cada tabla a un archivo .sql separado usando mysqldump si está disponible,
// o usa mysql2 para generar INSERTs si no.

import { createPool } from "mysql2/promise";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const DB = {
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "cancha_control",
};

const TABLES = [
  "users",
  "courts",
  "settings",
  "rates",
  "holidays",
  "bookings",
  "court_slots",
  "payments",
  "audit_log",
];

const destDir = process.argv[2] || path.resolve(process.cwd(), "backups");
fs.mkdirSync(destDir, { recursive: true });

const timestamp = new Date()
  .toISOString()
  .replace(/[:.]/g, "-")
  .slice(0, 19);

async function tryMysqldump() {
  try {
    execSync("which mysqldump", { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

async function backupWithMysqldump() {
  const file = path.join(destDir, `cancha_control_${timestamp}.sql`);
  const cmd = `mysqldump -h ${DB.host} -P ${DB.port} -u ${DB.user}${
    DB.password ? ` -p${DB.password}` : ""
  } ${DB.database}`;
  const sql = execSync(cmd, { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 });
  fs.writeFileSync(file, sql);
  console.log(`✅ Copia completa: ${file}`);
  return file;
}

async function backupWithMysql2() {
  const pool = createPool(DB);
  const files = [];
  try {
    for (const table of TABLES) {
      const [rows] = await pool.query(`SELECT * FROM \`${table}\``);
      if (!rows.length) continue;

      const cols = Object.keys(rows[0]);
      const file = path.join(destDir, `${table}_${timestamp}.sql`);
      const lines = [
        `-- Tabla: ${table}`,
        `-- Fecha: ${new Date().toISOString()}`,
        `-- Filas: ${rows.length}`,
        "",
      ];

      for (const row of rows) {
        const values = cols.map((c) => {
          const v = row[c];
          if (v === null) return "NULL";
          if (typeof v === "string") return `'${String(v).replace(/'/g, "''")}'`;
          if (v instanceof Date) return `'${v.toISOString().slice(0, 19).replace("T", " ")}'`;
          return String(v);
        });
        lines.push(
          `INSERT INTO \`${table}\` (${cols.map((c) => `\`${c}\``).join(", ")}) VALUES (${values.join(", ")});`,
        );
      }

      fs.writeFileSync(file, lines.join("\n") + "\n");
      files.push(file);
    }
    console.log(`✅ Copia por tablas en: ${destDir}`);
    for (const f of files) console.log(`   - ${f}`);
    return files;
  } finally {
    await pool.end();
  }
}

async function main() {
  console.log(`📦 Iniciando copia de seguridad de ${DB.database}…`);
  try {
    if (await tryMysqldump()) {
      await backupWithMysqldump();
    } else {
      console.log("⚠️  mysqldump no disponible, usando mysql2 (exportación por tablas)");
      await backupWithMysql2();
    }
    console.log("✅ Copia de seguridad completada");
  } catch (e) {
    console.error("❌ Error en la copia de seguridad:", e.message);
    process.exit(1);
  }
}

main();
