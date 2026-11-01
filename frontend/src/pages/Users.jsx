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
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { Add, Edit } from "@mui/icons-material";
import API, { errMsg } from "../api/axios";
import { useNotify } from "../context/NotifyContext";
import { roleLabel } from "../utils/format";

const ROLES = ["administrador", "cliente", "dueno", "vigilancia"];
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
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await API.get("/users", { params: { page, limit: 20 } });
      setRows(r.data.data ?? []);
      setTotal(r.data.total ?? 0);
      setTotalPages(r.data.totalPages ?? 1);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [page]);

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

  const setF = (k) => (e) =>
    setDialog({
      ...dialog,
      form: {
        ...dialog.form,
        [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
      },
    });

  return (
    <Box>
      <Stack direction="row" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight={700} sx={{ flexGrow: 1 }}>
          Usuarios
        </Typography>
        <Button
          startIcon={<Add />}
          variant="contained"
          onClick={() => open("create")}
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
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Teléfono</TableCell>
              <TableCell>Rol</TableCell>
              <TableCell>Activo</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((u) => (
              <TableRow key={u.id}>
                <TableCell>{u.name}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.phone ?? "—"}</TableCell>
                <TableCell>
                  <Chip size="small" label={roleLabel(u.role)} />
                </TableCell>
                <TableCell>{u.active ? "✔" : "✘"}</TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => open("edit", u)}>
                    <Edit fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
