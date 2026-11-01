// backend/src/routes/user.routes.js
import express from "express";
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
} from "../controllers/user.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";

const router = express.Router();
// Gestión de usuarios y roles: exclusivo del administrador (RF04).
router.use(protect, authorize("administrador"));
router.route("/").get(getUsers).post(createUser);
router.route("/:id").get(getUserById).put(updateUser);

export default router;
