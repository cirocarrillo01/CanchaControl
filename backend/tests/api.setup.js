// tests/api.setup.js — Helper para levantar el servidor Express en pruebas de integración
import { createServer } from "http";
import { app } from "../src/server.js";

let server;
let baseUrl;

export async function startTestServer() {
  return new Promise((resolve, reject) => {
    server = createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      resolve({ server, baseUrl, port });
    });
    server.on("error", reject);
  });
}

export async function stopTestServer() {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => resolve());
    } else {
      resolve();
    }
  });
}

export { baseUrl };
