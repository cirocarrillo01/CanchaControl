// frontend/src/api/axios.js
import axios from "axios";

// Instancia de axios con la URL base del backend (configurable con VITE_API_URL).
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

// Solicitud: agrega el token JWT a la cabecera Authorization solo si hay sesión activa.
API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  // Los endpoints públicos (disponibilidad, canchas) no requieren token;
  // el backend los atiende con optionalAuth aunque se envíe el token.
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

// Respuesta: si el token venció o es inválido, se cierra la sesión (RNF06).
API.interceptors.response.use(
  (res) => res,
  (error) => {
    const isAuthCall = error.config?.url?.startsWith("/auth/login");
    if (
      error.response?.status === 401 &&
      localStorage.getItem("token") &&
      !isAuthCall
    ) {
      localStorage.removeItem("token");
      window.dispatchEvent(new Event("auth:expired"));
    }
    return Promise.reject(error);
  },
);

/** Extrae el mensaje legible de un error de axios. */
export const errMsg = (e, fallback = "Ocurrió un error inesperado") =>
  e?.response?.data?.message || fallback;

export default API;
