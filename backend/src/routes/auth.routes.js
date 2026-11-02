// backend/src/routes/auth.routes.js
import express from "express";
import {
  register,
  login,
  getMe,
  changePassword,
  deleteMe,
} from "../controllers/auth.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getMe);
router.put("/password", protect, changePassword);
router.delete("/me", protect, deleteMe);

export default router;
