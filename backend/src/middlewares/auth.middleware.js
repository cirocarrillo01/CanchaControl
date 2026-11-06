// backend/src/middlewares/auth.middleware.js
import {
  extractTokenFromHeader,
  verifyToken,
} from "../services/token.service.js";
import User from "../models/User.js";

/** Lee el token (si existe) y devuelve el usuario activo, o null. */
const resolveUser = async (req) => {
  const token = extractTokenFromHeader(req.headers.authorization);
  if (!token) return null;
  const decoded = verifyToken(token);
  const user = await User.findById(decoded.id);
  return user && user.active ? user : null;
};

/** Exige sesión válida; adjunta req.user = { id, name, email, phone, role }. */
export const protect = async (req, res, next) => {
  try {
    const user = await resolveUser(req);
    if (!user)
      return res
        .status(401)
        .json({ success: false, message: "No autorizado, inicia sesión" });
    req.user = user;
    next();
  } catch {
    res
      .status(401)
      .json({ success: false, message: "Sesión inválida o vencida" });
  }
};

/** Sesión opcional: sirve para endpoints públicos (disponibilidad RF13). */
export const optionalAuth = async (req, res, next) => {
  try {
    req.user = await resolveUser(req);
  } catch {
    req.user = null;
  }
  next();
};

/** Autorización por rol. Usa strings literales para evitar problemas de caché de módulos. */
export const authorize =
  (...allowedRoles) =>
  (req, res, next) => {
    const userRole = req.user?.role;

    if (!userRole) {
      return res.status(401).json({
        success: false,
        message: "No hay usuario en la sesión",
      });
    }

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: "Tu rol no tiene permiso para esta acción",
      });
    }
    next();
  };
