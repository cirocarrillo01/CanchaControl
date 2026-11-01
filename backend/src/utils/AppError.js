// backend/src/utils/AppError.js
// Error controlado con código HTTP; lo formatea el middleware global.
export class AppError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

/** Convierte el resultado { error, data } de un validador en datos o lanza 400. */
export const check = ({ error, data }) => {
  if (error) throw new AppError(400, error);
  return data;
};
