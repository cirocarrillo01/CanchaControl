// backend/src/controllers/auth.controller.js
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError, check } from "../utils/AppError.js";
import {
  validateLogin,
  validateRegister,
  validatePasswordChange,
} from "../validators/user.validator.js";
import { MAX_LOGIN_ATTEMPTS, LOCK_MINUTES } from "../config/constants.js";
import User from "../models/User.js";

const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  role: u.role,
});

/** POST /api/auth/register · Público · RF05: solo crea clientes (el rol nunca viene del body). */
export const register = asyncHandler(async (req, res) => {
  const data = check(validateRegister(req.body));
  // Ya sabemos que accept_terms === true porque el validador lo exige:
  const user = await User.create({
    ...data,
    role: "cliente",
    acceptTerms: true,
  });
  res.status(201).json({
    success: true,
    token: User.generateToken(user),
    user: publicUser(user),
  });
});

/** POST /api/auth/login · Público · RF01 + RNF06 (bloqueo tras 5 intentos fallidos). */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  const data = check(validateLogin({ email, password }));

  const user = await User.findByEmail(data.email);
  const generic = new AppError(401, "Credenciales incorrectas");

  if (!user) throw generic;
  if (User.isLocked(user)) {
    throw new AppError(
      423,
      `Cuenta bloqueada temporalmente por intentos fallidos. Intenta de nuevo en ${LOCK_MINUTES} minutos`,
    );
  }
  if (!user.active) {
    throw new AppError(
      403,
      "Tu cuenta está desactivada. Contacta al administrador",
    );
  }

  if (!(await User.matchPassword(data.password, user.password))) {
    await User.registerFailure(user);
    const left = MAX_LOGIN_ATTEMPTS - (user.failed_attempts + 1);
    throw left > 0
      ? new AppError(
          401,
          `Credenciales incorrectas. Te quedan ${left} intento(s)`,
        )
      : new AppError(423, `Cuenta bloqueada por ${LOCK_MINUTES} minutos`);
  }

  await User.resetFailures(user.id);
  res.json({
    success: true,
    token: User.generateToken(user),
    user: publicUser(user),
  });
});

/** GET /api/auth/me · Privado: devuelve el usuario de la sesión. */
export const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: publicUser(req.user) });
});

/** PUT /api/auth/password · Privado · RF03. */
export const changePassword = asyncHandler(async (req, res) => {
  const { current, next } = check(validatePasswordChange(req.body));
  await User.changePassword(req.user.id, current, next);
  res.json({ success: true, message: "Contraseña actualizada" });
});
