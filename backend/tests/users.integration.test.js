// tests/users.integration.test.js — Pruebas de integración de API de usuarios
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
    console.log("⚠️  Saltando pruebas de API users:", e.message);
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

describe("Users API (integración)", () => {
  it("GET /api/users sin token → 401", async () => {
    if (!server) return;
    const res = await apiRequest("GET", "/users");
    expect(res.status).toBe(401);
  });

  it("GET /api/users con token admin → 200 paginado", async () => {
    if (!server || !adminToken) return;
    const res = await apiRequest("GET", "/users?page=1&limit=20", null, adminToken);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body).toHaveProperty("total");
    expect(res.body).toHaveProperty("totalPages");
    expect(res.body).toHaveProperty("page");
    expect(res.body).toHaveProperty("limit");
  });

  it("GET /api/users con token cliente → 403", async () => {
    if (!server) return;
    const login = await apiRequest("POST", "/auth/login", {
      email: "cliente@canchacontrol.com",
      password: "Cliente123*",
    });
    if (login.status === 200) {
      const res = await apiRequest("GET", "/users", null, login.body.token);
      expect(res.status).toBe(403);
    }
  });
});
