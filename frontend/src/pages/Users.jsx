// frontend/src/pages/Users.jsx
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Pagination,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { Add, Delete, Edit } from "@mui/icons-material";
import API, { errMsg } from "../api/axios";
import { useNotify } from "../context/NotifyContext";
import { useAuth } from "../context/AuthContext";
import { roleLabel } from "../utils/format";

const ROLES = ["administrador", "cliente", "auditor", "vigilancia"];
const EMPTY = {
  name: "",
  email: "",
  phone: "",
  password: "",
  role: "cliente",
  active: true,
};

export default function Users() {
  const notify = useNotify();
  const { user: currentUser } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page, limit: 20 };
      if (q && q.trim()) params.q = q.trim();
      if (roleFilter !== "all") params.role = roleFilter;
      const r = await API.get("/users", { params });
      setRows(r.data.data ?? []);
      setTotal(r.data.total ?? 0);
      setTotalPages(r.data.totalPages ?? 1);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [page, q, roleFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const open = (mode, user) =>
    setDialog({
      mode,
      form: mode === "edit" ? { ...user, password: "" } : EMPTY,
    });

  const save = async () => {
    try {
      if (dialog.mode === "create") await API.post("/users", dialog.form);
      else await API.put(`/users/${dialog.form.id}`, dialog.form);
      notify("Guardado", "success");
      setDialog(null);
      load();
    } catch (e) {
      notify(errMsg(e), "error");
    }
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await API.delete(`/users/${confirmDelete.id}`);
      notify("Usuario eliminado", "success");
      setConfirmDelete(null);
      load();
    } catch (e) {
      notify(errMsg(e), "error");
    } finally {
      setDeleting(false);
    }
  };

  const setF = (k) => (e) =>
    setDialog({
      ...dialog,
      form: {
        ...dialog.form,
        [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
      },
    });

  return (
    <Box sx={{ width: "100%", minWidth: 0 }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        alignItems={{ md: "center" }}
        spacing={2}
        mb={2}
      >
        <Typography
          variant="h5"
          fontWeight={700}
          sx={{ flexGrow: 1, minWidth: "max-content" }}
        >
          Usuarios
        </Typography>
        <TextField
          placeholder="Buscar por nombre, email o teléfono…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          sx={{
            flexGrow: { xs: 1, md: 0 },
            minWidth: { xs: "100%", sm: 320, md: 420 },
            maxWidth: { md: 520 },
            "& .MuiOutlinedInput-root": { height: 42 }, // ← mismo alto que el botón
          }}
          InputProps={{ sx: { fontSize: 15 } }}
        />
        <TextField
          size="small"
          select
          label="Rol"
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
          sx={{
            minWidth: { xs: "100%", sm: 170 },
            "& .MuiOutlinedInput-root": { height: 42 }, // ← mismo alto
          }}
        >
          <MenuItem value="all">Todos</MenuItem>
          {ROLES.map((r) => (
            <MenuItem key={r} value={r}>
              {roleLabel(r)}
            </MenuItem>
          ))}
        </TextField>
        <Button
          startIcon={<Add />}
          variant="contained"
          onClick={() => open("create")}
          sx={{ whiteSpace: "nowrap", height: 42 }} // ← mismo alto
        >
          Nuevo usuario
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {loading ? (
        <CircularProgress />
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Teléfono</TableCell>
                <TableCell>Rol</TableCell>
                <TableCell>Activo</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    Sin resultados
                  </TableCell>
                </TableRow>
              )}
              {rows.map((u) => {
                const isMe = u.id === currentUser?.id;
                return (
                  <TableRow key={u.id}>
                    <TableCell>{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{u.phone ?? "—"}</TableCell>
                    <TableCell>
                      <Chip size="small" label={roleLabel(u.role)} />
                    </TableCell>
                    <TableCell>{u.active ? "✔" : "✘"}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => open("edit", u)}>
                        <Edit fontSize="small" />
                      </IconButton>
                      <Tooltip
                        title={
                          isMe
                            ? "Usa 'Eliminar mi cuenta' en tu perfil"
                            : "Eliminar cuenta"
                        }
                      >
                        <span>
                          <IconButton
                            size="small"
                            color="error"
                            disabled={isMe}
                            onClick={() => setConfirmDelete(u)}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {dialog && (
        <Dialog open onClose={() => setDialog(null)} fullWidth maxWidth="xs">
          <DialogTitle>
            {dialog.mode === "create" ? "Nuevo usuario" : "Editar usuario"}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} mt={1}>
              <TextField
                label="Nombre"
                value={dialog.form.name}
                onChange={setF("name")}
                fullWidth
              />
              {dialog.mode === "create" && (
                <TextField
                  label="Email"
                  value={dialog.form.email}
                  onChange={setF("email")}
                  fullWidth
                />
              )}
              <TextField
                label="Teléfono"
                value={dialog.form.phone ?? ""}
                onChange={setF("phone")}
                fullWidth
              />
              <TextField
                label="Rol"
                select
                value={dialog.form.role}
                onChange={setF("role")}
                fullWidth
              >
                {ROLES.map((r) => (
                  <MenuItem key={r} value={r}>
                    {roleLabel(r)}
                  </MenuItem>
                ))}
              </TextField>
              {dialog.mode === "create" && (
                <TextField
                  label="Contraseña"
                  type="password"
                  value={dialog.form.password}
                  onChange={setF("password")}
                  helperText="Mín. 8 caracteres, letras y números"
                  fullWidth
                />
              )}
              <Stack direction="row" alignItems="center" spacing={1}>
                <Switch
                  checked={Boolean(dialog.form.active)}
                  onChange={setF("active")}
                />
                <Typography>Activo</Typography>
              </Stack>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialog(null)}>Cancelar</Button>
            <Button variant="contained" onClick={save}>
              Guardar
            </Button>
          </DialogActions>
        </Dialog>
      )}

      <Dialog
        open={Boolean(confirmDelete)}
        onClose={() => (deleting ? null : setConfirmDelete(null))}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Eliminar usuario</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            ¿Eliminar la cuenta de <b>{confirmDelete?.name}</b> (
            {confirmDelete?.email})?
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            mt={1}
          >
            El usuario no podrá volver a iniciar sesión. Sus reservas y pagos
            históricos se conservarán de forma anónima.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)} disabled={deleting}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={doDelete}
            disabled={deleting}
          >
            {deleting ? "Eliminando…" : "Eliminar"}
          </Button>
        </DialogActions>
      </Dialog>

      {total > 0 && (
        <Box sx={{ mt: 3, display: "flex", justifyContent: "center" }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_e, val) => setPage(val)}
            showFirstButton
            showLastButton
          />
        </Box>
      )}
    </Box>
  );
}

