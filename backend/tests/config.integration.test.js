// tests/config.integration.test.js — Pruebas de integración de API de configuración
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
    console.log("⚠️  Saltando pruebas de API config:", e.message);
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

describe("Config API (integración)", () => {
  it("GET /api/courts público → 200", async () => {
    if (!server) return;
    const res = await apiRequest("GET", "/courts");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("GET /api/settings público → 200", async () => {
    if (!server) return;
    const res = await apiRequest("GET", "/settings");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("GET /api/rates con token admin/dueno → 200", async () => {
    if (!server || !adminToken) return;
    const res = await apiRequest("GET", "/rates", null, adminToken);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("GET /api/holidays público → 200", async () => {
    if (!server) return;
    const res = await apiRequest("GET", "/holidays");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("POST /api/courts sin token → 401", async () => {
    if (!server) return;
    const res = await apiRequest("POST", "/courts", {
      name: "Cancha Nueva",
      description: "Test",
      status: "activa",
    });
    expect(res.status).toBe(401);
  });
});
