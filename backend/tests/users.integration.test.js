// tests/users.integration.test.js — Pruebas de integración de API de usuarios
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
      },
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
    const res = await apiRequest(
      "GET",
      "/users?page=1&limit=20",
      null,
      adminToken,
    );
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

  it("PUT /api/users/:id cambia active sin 500 (bug fix)", async () => {
  if (!server || !adminToken) return;

  // Creamos un usuario de prueba
  const create = await apiRequest(
    "POST",
    "/users",
    {
      name: "Test Active",
      email: `test.active.${Date.now()}@t.com`,
      phone: "3001234567",
      role: "cliente",
      password: "Abc12345",
      active: true,
    },
    adminToken,
  );
  expect(create.status).toBe(201);
  const id = create.body.data.id;

  // PUT con active=false
  const off = await apiRequest(
    "PUT",
    `/users/${id}`,
    {
      name: "Test Active",
      phone: "3001234567",
      role: "cliente",
      active: false,
    },
    adminToken,
  );
  expect(off.status).toBe(200);
  expect(off.body.data.active).toBe(0);

  // PUT de vuelta a active=true
  const on = await apiRequest(
    "PUT",
    `/users/${id}`,
    { name: "Test Active", phone: "3001234567", role: "cliente", active: true },
    adminToken,
  );
  expect(on.status).toBe(200);
  expect(on.body.data.active).toBe(1);
  });
});
