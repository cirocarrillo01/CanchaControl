// backend/src/controllers/user.controller.js
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError, check } from "../utils/AppError.js";
import { validateUserAdmin } from "../validators/user.validator.js";
import User from "../models/User.js";

/** @route GET /api/users · Solo administrador · RF04 */
export const getUsers = asyncHandler(async (req, res) => {
  const result = await User.findAll({
    page: req.query.page,
    limit: req.query.limit,
  });
  res.json({ success: true, ...result });
});

/** @route GET /api/users/:id · Solo administrador */
export const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError(404, "Usuario no encontrado");
  res.json({ success: true, data: user });
});

/** @route POST /api/users · Solo administrador · RF04: crea usuarios de cualquier rol */
export const createUser = asyncHandler(async (req, res) => {
  const data = check(validateUserAdmin(req.body, true));
  const user = await User.create(data);
  res.status(201).json({ success: true, data: user });
});

/** @route PUT /api/users/:id · Solo administrador · RF04: edita rol y activa/desactiva */
export const updateUser = asyncHandler(async (req, res) => {
  const data = check(validateUserAdmin(req.body));
  // Evita que el único administrador se quite el acceso por accidente.
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
