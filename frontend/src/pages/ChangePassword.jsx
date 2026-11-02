// frontend/src/pages/ChangePassword.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { ArrowBack, DeleteForever, Lock } from "@mui/icons-material";
import API, { errMsg } from "../api/axios";
import { useNotify } from "../context/NotifyContext";
import { useAuth } from "../context/AuthContext";
import { homeFor } from "../utils/format";

const passwordError = (p) => {
  if (
    typeof p !== "string" ||
    p.length < 8 ||
    !/[A-Za-z]/.test(p) ||
    !/\d/.test(p)
  )
    return "La contraseña debe tener mínimo 8 caracteres, con letras y números";
  return null;
};

export default function ChangePassword() {
  const notify = useNotify();
  const navigate = useNavigate();
  const { user, deleteAccount } = useAuth();
  const [form, setForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (form.new_password !== form.confirm_password) {
      setError("Las contraseñas nuevas no coinciden");
      return;
    }
    const pe = passwordError(form.new_password);
    if (pe) {
      setError(pe);
      return;
    }
    setBusy(true);
    try {
      await API.put("/auth/password", {
        current_password: form.current_password,
        new_password: form.new_password,
      });
      setSuccess("Contraseña actualizada correctamente");
      setForm({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
      notify("Contraseña actualizada", "success");
    } catch (err) {
      setError(errMsg(err, "No se pudo actualizar la contraseña"));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteAccount();
      notify("Tu cuenta fue eliminada", "success");
      navigate("/login", { replace: true });
    } catch (err) {
      setDeleteError(errMsg(err, "No se pudo eliminar la cuenta"));
    } finally {
      setDeleting(false);
    }
  };

  const canDelete = user?.role === "cliente" || user?.role === "administrador";

  return (
    <Box sx={{ maxWidth: 500, mx: "auto", mt: 4 }}>
      <Card>
        <CardHeader
          title="Mi cuenta"
          subheader="Cambia tu contraseña o elimina tu cuenta"
          avatar={<Lock sx={{ bgcolor: "primary.main", color: "white" }} />}
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
            <Stack spacing={2}>
              <Typography variant="subtitle2" color="text.secondary">
                Cambiar contraseña
              </Typography>
              <TextField
                label="Contraseña actual"
                type="password"
                fullWidth
                required
                autoComplete="current-password"
                value={form.current_password}
                onChange={set("current_password")}
              />
              <TextField
                label="Contraseña nueva"
                type="password"
                fullWidth
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
                required
                autoComplete="new-password"
                value={form.confirm_password}
                onChange={set("confirm_password")}
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={busy}
              >
                {busy ? "Actualizando…" : "Actualizar contraseña"}
              </Button>
              <Button
                startIcon={<ArrowBack />}
                onClick={() => navigate(homeFor(user?.role))}
              >
                Volver
              </Button>
            </Stack>
          </form>

          {canDelete && (
            <>
              <Divider sx={{ my: 3 }} />
              <Typography variant="subtitle2" color="error" gutterBottom>
                Zona peligrosa
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                mb={2}
              >
                Al eliminar tu cuenta se cierra la sesión, se borran tus datos
                personales y no podrás iniciar sesión de nuevo con este correo.
                Las reservas históricas se conservarán de forma anónima por
                obligación contable.
              </Typography>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteForever />}
                onClick={() => {
                  setDeleteError("");
                  setDeleteOpen(true);
                }}
              >
                Eliminar mi cuenta
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={deleteOpen}
        onClose={() => (deleting ? null : setDeleteOpen(false))}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>¿Eliminar mi cuenta?</DialogTitle>
        <DialogContent>
          {deleteError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {deleteError}
            </Alert>
          )}
          <Typography variant="body2">
            Esta acción <b>no se puede deshacer</b>. Si tienes reservas activas
            o pendientes, deberás cancelarlas primero. Si eres el único
            administrador activo, la operación será rechazada.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)} disabled={deleting}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Eliminando…" : "Sí, eliminar mi cuenta"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
