// backend/src/controllers/user.controller.js
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError, check } from "../utils/AppError.js";
import { validateUserAdmin } from "../validators/user.validator.js";
import User from "../models/User.js";

/** GET /api/users · Solo administrador · RF04 */
export const getUsers = asyncHandler(async (req, res) => {
  const result = await User.findAll({
    page: req.query.page,
    limit: req.query.limit,
    q: req.query.q,
    role: req.query.role,
  });
  res.json({ success: true, ...result });
});

export const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError(404, "Usuario no encontrado");
  res.json({ success: true, data: user });
});

export const createUser = asyncHandler(async (req, res) => {
  const data = check(validateUserAdmin(req.body, true));
  const user = await User.create(data);
  res.status(201).json({ success: true, data: user });
});

export const updateUser = asyncHandler(async (req, res) => {
  const data = check(validateUserAdmin(req.body));
  if (
    Number(req.params.id) === req.user.id &&
    (data.role !== "administrador" || !data.active)
  ) {
    throw new AppError(
      400,
      "No puedes quitarte tu propio rol de administrador ni desactivarte",
    );
  }
  res.json({ success: true, data: await User.update(req.params.id, data) });
});

/** DELETE /api/users/:id · Solo administrador */
export const deleteUser = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!id) throw new AppError(400, "ID inválido");

  if (id === req.user.id)
    throw new AppError(
      400,
      "No puedes eliminar tu propia cuenta. Otro administrador debe realizar esta acción.",
    );

  const target = await User.findById(id);
  if (!target) throw new AppError(404, "Usuario no encontrado");

  if (target.role === "administrador") {
    const admins = await User.countActiveAdmins();
    if (admins <= 1)
      throw new AppError(
        409,
        "No se puede eliminar al único administrador activo.",
      );
  }

  if (target.role === "cliente") {
    const pending = await User.countActiveBookings(id);
    if (pending > 0)
      throw new AppError(
        409,
        "El cliente tiene reservas activas o pendientes; no se puede eliminar.",
      );
  }

  await User.anonymize(id);
  res.json({ success: true, message: "Usuario eliminado" });
});
