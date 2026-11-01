// backend/src/server.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import { testConnection } from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import configRoutes from "./routes/config.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import reportRoutes from "./routes/report.routes.js";
import { errorHandler, notFound } from "./middlewares/error.middleware.js";
import { expireStale } from "./services/schedule.service.js";
import { nowBogota } from "./utils/time.js";

if (!process.env.JWT_SECRET) {
  console.error(
    "Falta JWT_SECRET en el .env: el servidor no puede iniciar sin él",
  );
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:5175",
  "http://127.0.0.1:5176",
];
if (process.env.ALLOWED_FRONTEND_URLS) {
  allowedOrigins.push(
    ...process.env.ALLOWED_FRONTEND_URLS.split(",").map((u) => u.trim()),
  );
}

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// Logging de peticiones en desarrollo para diagnosticar 403/401
if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    const auth = req.headers.authorization ? `Bearer ${req.headers.authorization.split(" ")[1]?.slice(0, 20)}...` : "sin-token";
    console.log(`[HTTP] ${req.method} ${req.originalUrl} auth=${auth}`);
    next();
  });
}

// Header de versión para verificar que se ejecuta el código nuevo
app.use((req, res, next) => {
  res.setHeader("X-API-Version", "2.1.0-client-booking-fixed");
  next();
});

// Montaje limpio: TODO bajo /api para que axios (baseURL .../api) coincida.
// bookingRoutes va ANTES que configRoutes y reportRoutes para tener prioridad.
app.use("/api/auth", authRoutes);        // /api/auth/*
app.use("/api/users", userRoutes);       // /api/users, /api/users/:id
app.use("/api", bookingRoutes);          // /api/availability, /api/bookings, /api/blocks (PRIORIDAD)
app.use("/api", configRoutes);           // /api/courts, /api/settings, /api/rates
app.use("/api", reportRoutes);           // /api/reports/*

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Backend funcionando",
    serverTime: nowBogota().datetime,
  });
});

app.use(notFound);
app.use(errorHandler);

const startServer = async () => {
  try {
    await testConnection();
    setInterval(
      () =>
        expireStale().catch((e) => console.error("expireStale:", e.message)),
      60_000,
    );
    app.listen(PORT, () =>
      console.log(`🚀 Backend en http://localhost:${PORT}`),
    );
  } catch (error) {
    console.error("No se pudo iniciar:", error.message);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== "test") {
  startServer();
}
export { app };
export default app;
