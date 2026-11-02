// frontend/src/context/AuthContext.jsx
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import API from "../api/axios";
import { useNotify } from "./NotifyContext";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const IDLE_MS = 15 * 60 * 1000;

export function AuthProvider({ children }) {
  const notify = useNotify();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(
    Boolean(localStorage.getItem("token")),
  );
  const idleTimer = useRef(null);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setUser(null);
  }, []);

  useEffect(() => {
    if (!localStorage.getItem("token")) return;
    API.get("/auth/me")
      .then((r) => setUser(r.data.user))
      .catch(() => localStorage.removeItem("token"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      notify("Tu sesión expiró, inicia sesión de nuevo", "warning");
    };
    window.addEventListener("auth:expired", onExpired);
    return () => window.removeEventListener("auth:expired", onExpired);
  }, [notify]);

  useEffect(() => {
    if (!user) return undefined;
    const reset = () => {
      clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => {
        logout();
        notify("Sesión cerrada por 15 minutos de inactividad", "info");
      }, IDLE_MS);
    };
    const events = ["mousemove", "keydown", "click", "touchstart"];
    events.forEach((e) => window.addEventListener(e, reset));
    reset();
    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      clearTimeout(idleTimer.current);
    };
  }, [user, logout, notify]);

  const authenticate = async (path, body) => {
    localStorage.removeItem("token");
    const res = await API.post(path, body);
    localStorage.setItem("token", res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  /** Elimina la cuenta propia y cierra sesión. */
  const deleteAccount = async () => {
    await API.delete("/auth/me");
    logout();
  };

  const value = {
    user,
    loading,
    logout,
    deleteAccount,
    login: (email, password) =>
      authenticate("/auth/login", { email, password }),
    register: (form) => authenticate("/auth/register", form),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
