// backend/src/validators/user.validator.js
/**
 * Validadores de entrada de usuarios. Retornan { error: string | null, data: object | null }.
 */

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const phoneRegex = /^[0-9+\s-]{7,15}$/; // celular colombiano, con o sin indicativo

const passwordError = (p) =>
  typeof p !== "string" || p.length < 8 || !/[A-Za-z]/.test(p) || !/\d/.test(p)
    ? "La contraseña debe tener mínimo 8 caracteres, con letras y números"
    : null;

export const ROLE_LIST = ["administrador", "cliente", "dueno", "vigilancia"];

/** RF05: registro de clientes. Exige aceptar el aviso de tratamiento de datos (Ley 1581). */
export const validateRegister = ({
  name,
  email,
  phone,
  password,
  accept_terms,
}) => {
  if (!name || !email || !phone || !password) {
    return { error: "Por favor llena todos los campos", data: null };
  }
  if (typeof name !== "string" || name.trim().length < 2) {
    return { error: "El nombre debe tener al menos 2 caracteres", data: null };
  }
  if (!emailRegex.test(email)) {
    return { error: "Por favor añade un email válido", data: null };
  }
  if (!phoneRegex.test(phone)) {
    return { error: "El teléfono debe tener entre 7 y 15 dígitos", data: null };
  }
  const pe = passwordError(password);
  if (pe) return { error: pe, data: null };
  if (accept_terms !== true) {
    return {
      error: "Debes aceptar el tratamiento de datos personales",
      data: null,
    };
  }
  return {
    error: null,
    data: {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      password,
    },
  };
};

export const validateLogin = ({ email, password }) => {
  if (!email || !password) {
    return { error: "Por favor llena todos los campos", data: null };
  }
  if (!emailRegex.test(email)) {
    return { error: "Por favor añade un email válido", data: null };
  }
  return { error: null, data: { email: email.trim().toLowerCase(), password } };
};

/** RF03 */
export const validatePasswordChange = ({ current_password, new_password }) => {
  if (!current_password || !new_password) {
    return { error: "Completa ambas contraseñas", data: null };
  }
  const pe = passwordError(new_password);
  if (pe) return { error: pe, data: null };
  return {
    error: null,
    data: { current: current_password, next: new_password },
  };
};

/** RF04: alta (create=true) y edición de usuarios por el administrador. */
export const validateUserAdmin = (b, create = false) => {
  if (!b.name || b.name.trim().length < 2) {
    return { error: "El nombre debe tener al menos 2 caracteres", data: null };
  }
  if (!ROLE_LIST.includes(b.role)) {
    return { error: "Rol inválido", data: null };
  }
  if (b.phone && !phoneRegex.test(b.phone)) {
    return { error: "Teléfono inválido", data: null };
  }
  const data = {
    name: b.name.trim(),
    phone: b.phone?.trim() || null,
    active: b.active !== false,
  };
  if (create) {
    if (!emailRegex.test(b.email || "")) {
      return { error: "Email inválido", data: null };
    }
    const pe = passwordError(b.password);
    if (pe) return { error: pe, data: null };
    data.email = b.email.trim().toLowerCase();
    data.password = b.password;
  }
  return { error: null, data };
};
