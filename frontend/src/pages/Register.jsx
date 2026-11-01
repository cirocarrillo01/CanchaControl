// frontend/src/pages/Register.jsx
import { useState } from "react";
import { Link as RouterLink, Navigate, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  Checkbox,
  FormControlLabel,
  Link,
  TextField,
  Typography,
} from "@mui/material";
import { SportsSoccer } from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";
import { errMsg } from "../api/axios";
import { homeFor } from "../utils/format";
import { authBg } from "./Login";

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    accept_terms: false,
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  const set = (k) => (e) =>
    setForm({
      ...form,
      [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
    });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const u = await register(form);
      navigate(homeFor(u.role));
    } catch (err) {
      setError(errMsg(err, "No se pudo crear la cuenta"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={authBg}>
      <Card
        component="form"
        onSubmit={submit}
        sx={{ p: 4, width: 400, maxWidth: "100%" }}
      >
        <Box sx={{ textAlign: "center", mb: 1 }}>
          <SportsSoccer color="primary" sx={{ fontSize: 44 }} />
          <Typography variant="h5" fontWeight={700}>
            Crear cuenta
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Regístrate como cliente
          </Typography>
        </Box>
        {error && (
          <Alert severity="error" sx={{ my: 1 }}>
            {error}
          </Alert>
        )}
        <TextField
          label="Nombre completo"
          fullWidth
          margin="normal"
          required
          value={form.name}
          onChange={set("name")}
        />
        <TextField
          label="Correo"
          type="email"
          fullWidth
          margin="normal"
          required
          value={form.email}
          onChange={set("email")}
        />
        <TextField
          label="Teléfono"
          fullWidth
          margin="normal"
          required
          value={form.phone}
          onChange={set("phone")}
        />
        <TextField
          label="Contraseña"
          type="password"
          fullWidth
          margin="normal"
          required
          helperText="Mínimo 8 caracteres, con letras y números"
          value={form.password}
          onChange={set("password")}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={form.accept_terms}
              onChange={set("accept_terms")}
              required
            />
          }
          label="Acepto el tratamiento de datos personales"
        />
        <Button
          type="submit"
          variant="contained"
          fullWidth
          size="large"
          disabled={busy || !form.accept_terms}
          sx={{ mt: 1.5 }}
        >
          Crear cuenta
        </Button>
        <Typography variant="body2" sx={{ mt: 2, textAlign: "center" }}>
          ¿Ya tienes cuenta?{" "}
          <Link component={RouterLink} to="/login">
            Ingresa
          </Link>
        </Typography>
      </Card>
    </Box>
  );
}
