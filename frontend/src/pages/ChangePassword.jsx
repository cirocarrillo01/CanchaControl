// frontend/src/pages/ChangePassword.jsx
import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  TextField,
  Typography,
} from "@mui/material";
import { Lock } from "@mui/icons-material";
import API, { errMsg } from "../api/axios";
import { useNotify } from "../context/NotifyContext";

export default function ChangePassword() {
  const notify = useNotify();
  const [form, setForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (form.new_password !== form.confirm_password) {
      setError("Las contraseñas nuevas no coinciden");
      return;
    }
    if (form.new_password.length < 8) {
      setError("La contraseña nueva debe tener mínimo 8 caracteres");
      return;
    }
    setBusy(true);
    try {
      await API.put("/auth/password", {
        current_password: form.current_password,
        new_password: form.new_password,
      });
      setSuccess("Contraseña actualizada correctamente");
      setForm({ current_password: "", new_password: "", confirm_password: "" });
      notify("Contraseña actualizada", "success");
    } catch (err) {
      setError(errMsg(err, "No se pudo actualizar la contraseña"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 420, mx: "auto", mt: 4 }}>
      <Card>
        <CardHeader
          title="Cambiar contraseña"
          subheader="RF03 · Cambia tu contraseña actual"
          avatar={<Lock sx={{ bgcolor: "primary.main" }} />}
        />
        <CardContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}
          <form onSubmit={submit}>
            <TextField
              label="Contraseña actual"
              type="password"
              fullWidth
              margin="normal"
              required
              autoComplete="current-password"
              value={form.current_password}
              onChange={set("current_password")}
            />
            <TextField
              label="Contraseña nueva"
              type="password"
              fullWidth
              margin="normal"
              required
              helperText="Mínimo 8 caracteres, con letras y números"
              autoComplete="new-password"
              value={form.new_password}
              onChange={set("new_password")}
            />
            <TextField
              label="Confirmar contraseña nueva"
              type="password"
              fullWidth
              margin="normal"
              required
              autoComplete="new-password"
              value={form.confirm_password}
              onChange={set("confirm_password")}
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={busy}
              sx={{ mt: 2 }}
            >
              {busy ? "Actualizando…" : "Actualizar contraseña"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
