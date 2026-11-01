// frontend/src/pages/Login.jsx
import { useState } from "react";
import { Link as RouterLink, Navigate, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  Link,
  TextField,
  Typography,
} from "@mui/material";
import { SportsSoccer } from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";
import { errMsg } from "../api/axios";
import { homeFor } from "../utils/format";

export const authBg = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  p: 2,
  background: "linear-gradient(135deg,#FF833A,#E65100 60%,#AC1900)",
};

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const u = await login(form.email, form.password);
      navigate(homeFor(u.role));
    } catch (err) {
      setError(errMsg(err, "No se pudo iniciar sesión"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={authBg}>
      <Card
        component="form"
        onSubmit={submit}
        sx={{ p: 4, width: 380, maxWidth: "100%" }}
      >
        <Box sx={{ textAlign: "center", mb: 1 }}>
          <SportsSoccer color="primary" sx={{ fontSize: 44 }} />
          <Typography variant="h5" fontWeight={700}>
            CanchaControl
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Inicia sesión para reservar y gestionar turnos
          </Typography>
        </Box>
        {error && (
          <Alert severity="error" sx={{ my: 1 }}>
            {error}
          </Alert>
        )}
        <TextField
          label="Correo"
          type="email"
          fullWidth
          margin="normal"
          required
          autoComplete="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <TextField
          label="Contraseña"
          type="password"
          fullWidth
          margin="normal"
          required
          autoComplete="current-password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <Button
          type="submit"
          variant="contained"
          fullWidth
          size="large"
          disabled={busy}
          sx={{ mt: 1.5 }}
        >
          Ingresar
        </Button>
        <Typography variant="body2" sx={{ mt: 2, textAlign: "center" }}>
          ¿No tienes cuenta?{" "}
          <Link component={RouterLink} to="/register">
            Regístrate
          </Link>
        </Typography>
        <Typography variant="body2" sx={{ mt: 1, textAlign: "center" }}>
          <Link component={RouterLink} to="/">
            Ver disponibilidad sin ingresar
          </Link>
        </Typography>
      </Card>
    </Box>
  );
}
