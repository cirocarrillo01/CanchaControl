// backend/src/utils/asyncHandler.js
/**
 * Wrapper para controladores async: captura errores y los pasa al
 * middleware de errores (evita try/catch repetido en cada controlador).
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
