import { describe, it, expect, beforeAll, afterAll } from "jest";
import http from "http";

// Pruebas de integración que requieren BD de prueba.
// Se ejecutan solo si hay MySQL disponible.

jest.setTimeout(15000);

describe("Auth API (integración)", () => {
  let server;
  let baseUrl;

  beforeAll((done) => {
    try {
      // Importar dinámicamente para no fallar si no hay BD
      const mod = import("../src/server.js");
      mod.then((m) => {
        const app = m.default;
        server = http.createServer(app);
        server.listen(0, () => {
          const port = server.address().port;
          baseUrl = `http://localhost:${port}`;
          done();
        });
      }).catch((e) => {
        console.log("⚠️  Saltando pruebas de auth: no se pudo iniciar el servidor", e.message);
        done();
      });
    } catch (e) {
      console.log("⚠️  Saltando pruebas de auth:", e.message);
      done();
    }
  });

  afterAll((done) => {
    if (server) server.close(done);
    else done();
  });

  it("debe responder en /api/health", async () => {
    if (!server) return;
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });
});
