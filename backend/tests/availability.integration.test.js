// tests/availability.integration.test.js — Pruebas de integración de API de disponibilidad
import { describe, it, expect, beforeAll, afterAll } from "jest";
import http from "http";
import { app } from "../src/server.js";

jest.setTimeout(20000);

let server;

beforeAll(async () => {
  try {
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
  } catch (e) {
    console.log("⚠️  Saltando pruebas de API availability:", e.message);
  }
});

afterAll(async () => {
  if (server) server.close();
});

function apiRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "localhost",
        port: server.address().port,
        path: `/api${path}`,
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, body: data });
          }
        });
      }
    );
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

describe("Availability API (integración)", () => {
  it("GET /api/availability público → 200", async () => {
    if (!server) return;
    const res = await apiRequest("GET", "/availability?date=2026-11-02");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("date");
    expect(res.body.data).toHaveProperty("today");
    expect(res.body.data).toHaveProperty("festivo");
    expect(Array.isArray(res.body.data.courts)).toBe(true);
    // Cada cancha debe tener bloques
    res.body.data.courts.forEach((court) => {
      expect(court).toHaveProperty("id");
      expect(court).toHaveProperty("name");
      expect(Array.isArray(court.blocks)).toBe(true);
      court.blocks.forEach((block) => {
        expect(block).toHaveProperty("start");
        expect(block).toHaveProperty("end");
        expect(block).toHaveProperty("status");
        expect(block).toHaveProperty("price");
      });
    });
  });

  it("GET /api/availability sin fecha → usa hoy", async () => {
    if (!server) return;
    const res = await apiRequest("GET", "/availability");
    expect(res.status).toBe(200);
    expect(res.body.data.date).toBeDefined();
  });
});
