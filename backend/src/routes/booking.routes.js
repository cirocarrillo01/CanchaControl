// backend/src/routes/booking.routes.js
import express from "express";
import * as b from "../controllers/booking.controller.js";
import {
  protect,
  optionalAuth,
  authorize,
} from "../middlewares/auth.middleware.js";

const router = express.Router();

// =====================================================================
// RUTAS PÚBLICAS
// =====================================================================
router.get("/availability", optionalAuth, b.availability);

// =====================================================================
// RUTAS ESPECÍFICAS (deben ir ANTES de /bookings/:id)
// =====================================================================
router.get(
  "/bookings/mis-reservas",
  protect,
  authorize("cliente"),
  b.listClientBookings,
);

router.get(
  "/bookings/today",
  protect,
  authorize("administrador", "vigilancia"),
  b.today,
);

router.get("/bookings/timers", protect, authorize("administrador"), b.timers);

// =====================================================================
// LISTADO GENERAL
// =====================================================================
router.get(
  "/bookings",
  protect,
  authorize("administrador", "dueno"),
  b.listBookingsAll,
);

// =====================================================================
// CREAR
// =====================================================================
router.post(
  "/bookings",
  protect,
  authorize("cliente", "administrador"),
  b.create,
);

// =====================================================================
// ACCIONES SOBRE UNA RESERVA ESPECÍFICA
// =====================================================================
router.post(
  "/bookings/:id/cancel",
  protect,
  authorize("cliente", "administrador"),
  b.cancel,
);

router.post(
  "/bookings/:id/confirm",
  protect,
  authorize("administrador"),
  b.confirm,
);

router.post(
  "/bookings/:id/reschedule",
  protect,
  authorize("administrador"),
  b.reschedule,
);

router.post(
  "/bookings/:id/payments",
  protect,
  authorize("administrador"),
  b.payment,
);

router.post(
  "/bookings/:id/timer/start",
  protect,
  authorize("administrador"),
  b.startTimer,
);

router.post(
  "/bookings/:id/finish",
  protect,
  authorize("administrador"),
  b.finish,
);

router.post(
  "/bookings/:id/checkin",
  protect,
  authorize("administrador", "vigilancia"),
  b.checkIn,
);

// ← NUEVAS: extensiones del cronómetro
router.post(
  "/bookings/:id/extra-time",
  protect,
  authorize("administrador"),
  b.addExtraTime,
);

router.post(
  "/bookings/:id/add-next",
  protect,
  authorize("administrador"),
  b.addNextBlock,
);

// =====================================================================
// DETALLE (param genérico, ÚLTIMO)
// =====================================================================
router.get("/bookings/:id", protect, authorize("cliente"), b.detail);

// =====================================================================
// BLOQUEOS
// =====================================================================
router.post("/blocks", protect, authorize("administrador"), b.createBlock);
router.delete(
  "/blocks/:slotId",
  protect,
  authorize("administrador"),
  b.removeBlock,
);

export default router;
