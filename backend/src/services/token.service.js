// backend/src/services/token.service.js
import jwt from "jsonwebtoken";

/** Servicio para manejo de tokens JWT. JWT_SECRET es obligatorio (se valida en server.js). */
export const signToken = (payload, options = {}) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "8h",
    ...options,
  });

export const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

export const extractTokenFromHeader = (authHeader) =>
  authHeader && authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : null;
