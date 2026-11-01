// backend/src/middlewares/error.middleware.js
// Middleware global de errores: respuesta con formato consistente.
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Error interno del servidor";

  if (err.code === "ER_DUP_ENTRY") {
    // Respaldo de RNF10 / unicidad de correos: la BD rechazó un duplicado.
    statusCode = 409;
    message =
      "Ya existe un registro con esos datos (o el bloque ya fue reservado)";
  } else if (err.type === "entity.parse.failed") {
    statusCode = 400;
    message = "El cuerpo de la petición no es un JSON válido";
  } else if (statusCode === 500) {
    console.error(err); // errores inesperados se registran; el cliente no ve detalles
    message = "Error interno del servidor";
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" &&
      statusCode === 500 && { stack: err.stack }),
  });
};

export const notFound = (req, res, next) => {
  const error = new Error(`Ruta no encontrada: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};
