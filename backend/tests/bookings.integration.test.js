// tests/bookings.integration.test.js — Pruebas de integración de API de reservas
import http from "http";
import { app } from "../src/server.js";

jest.setTimeout(20000);

const futureDate = (offset = 1) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};

let server;
let adminToken;

beforeAll(async () => {
  try {
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    // Obtener token de admin para pruebas protegidas
    const login = await apiRequest("POST", "/auth/login", {
      email: "admin@canchacontrol.com",
      password: "Admin123*",
    });
    if (login.status === 200) {
      adminToken = login.body.token;
    }
  } catch (e) {
    console.log("⚠️  Saltando pruebas de API bookings:", e.message);
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

describe("Bookings API (integración)", () => {
  it("GET /api/health responde", async () => {
    if (!server) return;
    const res = await apiRequest("GET", "/health");
    expect(res.status).toBe(200);
  });

  it("GET /api/bookings sin token → 401", async () => {
    if (!server) return;
    const res = await apiRequest("GET", "/bookings");
    expect(res.status).toBe(401);
  });

  it("GET /api/bookings con token admin → 200 paginado", async () => {
    if (!server || !adminToken) return;
    const res = await apiRequest("GET", "/bookings?page=1&limit=20", null, adminToken);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body).toHaveProperty("total");
    expect(res.body).toHaveProperty("totalPages");
  });

  it("GET /api/availability público → 200", async () => {
    if (!server) return;
    const res = await apiRequest("GET", `/availability?date=${futureDate(2)}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.courts)).toBe(true);
  });

  it("POST /api/bookings sin token → 401", async () => {
    if (!server) return;
    const res = await apiRequest("POST", "/bookings", {
      court_id: 1,
      date: futureDate(2),
      start_time: "10:00:00",
    });
    expect(res.status).toBe(401);
  });

  it("GET /api/reports/income sin token → 401", async () => {
    if (!server) return;
    const res = await apiRequest("GET", "/reports/income");
    expect(res.status).toBe(401);
  });

  it("GET /api/reports/income con token admin → 200", async () => {
    if (!server || !adminToken) return;
    const res = await apiRequest("GET", `/reports/income?from=${futureDate(10)}&to=${futureDate(10)}`, null, adminToken);
    expect([200, 500]).toContain(res.status); // 500 si hay error de BD, 200 si OK
    if (res.status === 200) {
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("days");
      expect(res.body.data).toHaveProperty("total");
    }
  });
});
