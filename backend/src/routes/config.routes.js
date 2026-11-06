// backend/src/routes/config.routes.js
import express from "express";
import * as c from "../controllers/config.controller.js";
import {
  protect,
  optionalAuth,
  authorize,
} from "../middlewares/auth.middleware.js";

const router = express.Router();
const admin = [protect, authorize("administrador")];

router.get("/courts", optionalAuth, c.listCourts); // Público
router.post("/courts", ...admin, c.createCourt);
router.put("/courts/:id", ...admin, c.updateCourt);
router.delete("/courts/:id", ...admin, c.deleteCourt);

router.get("/settings", c.readSettings); // Público
router.put("/settings", ...admin, c.updateSettings);

router.get("/rates", protect, authorize("administrador", "auditor"), c.listRates);
router.post("/rates", ...admin, c.createRate);
router.put("/rates/:id", ...admin, c.updateRate);
router.delete("/rates/:id", ...admin, c.deleteRate);

router.get("/holidays", optionalAuth, c.listHolidays);
router.post("/holidays", ...admin, c.createHoliday);
router.delete("/holidays/:id", ...admin, c.deleteHoliday);

export default router;

