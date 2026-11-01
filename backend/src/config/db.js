// backend/src/config/db.js
import { createPool } from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

export const pool = createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "cancha_control",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
  decimalNumbers: true,
});

pool.pool.on("connection", (conn) => conn.query("SET time_zone = '-05:00'"));

export const testConnection = async () => {
  const connection = await pool.getConnection();
  try {
    console.log("✅ MySQL conectado correctamente");
  } finally {
    connection.release();
  }
};

export const withTransaction = async (fn) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

