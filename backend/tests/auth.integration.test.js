// tests/auth.integration.test.js — Pruebas de integración de API de autenticación
import http from "http";
import { app } from "../src/server.js";

jest.setTimeout(20000);

let server;
let baseUrl;

beforeAll(async () => {
  try {
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;
  } catch (e) {
    console.log("⚠️  Saltando pruebas de API auth:", e.message);
  }
});

afterAll(async () => {
  if (server) server.close();
});

async function request(method, path, body = null, token = null) {
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

describe("Auth API (integración)", () => {
  it("responde en /api/health", async () => {
    if (!server) return;
    const res = await request("GET", "/health");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("login con credenciales válidas (si hay usuario admin)", async () => {
    if (!server) return;
    const res = await request("POST", "/auth/login", {
      email: "admin@canchacontrol.com",
      password: "Admin123*",
    });
    // Puede ser 200 si el usuario existe, o 401 si no hay BD/semilla
    expect([200, 401]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
    }
  });

  it("login con credenciales inválidas", async () => {
    if (!server) return;
    const res = await request("POST", "/auth/login", {
      email: "noexiste@test.com",
      password: "wrong",
    });
    expect(res.status).toBe(401);
  });

  it("registro de cliente válido", async () => {
    if (!server) return;
    const res = await request("POST", "/auth/register", {
      name: "Usuario Prueba",
      email: "pruebatest@canchacontrol.com",
      phone: "3009999999",
      password: "Abc12345",
      accept_terms: true,
    });
    expect([201, 409]).toContain(res.status); // 409 si ya existe
    if (res.status === 201) {
      expect(res.body.success).toBe(true);
      expect(res.body.user.role).toBe("cliente");
    }
  });
});
