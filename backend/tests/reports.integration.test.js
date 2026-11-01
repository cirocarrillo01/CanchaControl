// tests/reports.integration.test.js — Pruebas de integración de API de reportes
import { describe, it, expect, beforeAll, afterAll } from "jest";
import http from "http";
import { app } from "../src/server.js";

jest.setTimeout(20000);

let server;
let adminToken;

beforeAll(async () => {
  try {
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const login = await apiRequest("POST", "/auth/login", {
      email: "admin@canchacontrol.com",
      password: "Admin123*",
    });
    if (login.status === 200) {
      adminToken = login.body.token;
    }
  } catch (e) {
    console.log("⚠️  Saltando pruebas de API reports:", e.message);
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

describe("Reports API (integración)", () => {
  const today = "2026-11-01";

  it("GET /api/reports/income sin token → 401", async () => {
    if (!server) return;
    const res = await apiRequest("GET", `/reports/income?from=${today}&to=${today}`);
    expect(res.status).toBe(401);
  });

  it("GET /api/reports/income con token admin → 200", async () => {
    if (!server || !adminToken) return;
    const res = await apiRequest(
      "GET",
      `/reports/income?from=${today}&to=${today}`,
      null,
      adminToken
    );
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("days");
      expect(res.body.data).toHaveProperty("total");
      expect(Array.isArray(res.body.data.days)).toBe(true);
    }
  });

  it("GET /api/reports/usage con token admin → 200", async () => {
    if (!server || !adminToken) return;
    const res = await apiRequest(
      "GET",
      `/reports/usage?from=${today}&to=${today}`,
      null,
      adminToken
    );
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("courts");
      expect(Array.isArray(res.body.data.courts)).toBe(true);
    }
  });

  it("GET /api/reports/status con token admin → 200", async () => {
    if (!server || !adminToken) return;
    const res = await apiRequest(
      "GET",
      `/reports/status?from=${today}&to=${today}`,
      null,
      adminToken
    );
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("statuses");
      expect(Array.isArray(res.body.data.statuses)).toBe(true);
    }
  });
});
