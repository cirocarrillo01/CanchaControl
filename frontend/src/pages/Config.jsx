// frontend/src/pages/Config.jsx
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { Block, Delete, Edit, Save } from "@mui/icons-material";
import API, { errMsg } from "../api/axios";
import { useNotify } from "../context/NotifyContext";
import { fmtDate, fmtMoney, fmtTime } from "../utils/format";

/* ------------------------------------------------------------------ */
/* Contenedor con pestañas                                             */
/* ------------------------------------------------------------------ */
export default function Config() {
  const [tab, setTab] = useState("settings");
  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={2}>
        Configuración
      </Typography>
      <Card>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="General" value="settings" />
          <Tab label="Canchas" value="courts" />
          <Tab label="Tarifas" value="rates" />
          <Tab label="Bloqueos" value="blocks" />
        </Tabs>
        <CardContent>
          {tab === "settings" && <Settings />}
          {tab === "courts" && <Courts />}
          {tab === "rates" && <Rates />}
          {tab === "blocks" && <Blocks />}
        </CardContent>
      </Card>
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* General — formulario a 2 columnas                                   */
/* ------------------------------------------------------------------ */
function Settings() {
  const notify = useNotify();
  const [s, setS] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await API.get("/settings");
      setS(r.data.data);
    } catch (e) {
      setError(errMsg(e));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    try {
      await API.put("/settings", s);
      notify("Configuración guardada", "success");
      load();
    } catch (e) {
      notify(errMsg(e), "error");
    }
  };

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!s) return <CircularProgress />;

  const set = (k) => (e) => setS({ ...s, [k]: e.target.value });

  return (
    <Box
      component="form"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <Grid container spacing={2} maxWidth={800}>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Nombre del negocio"
            value={s.business_name}
            onChange={set("business_name")}
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={6} />

        <Grid item xs={12} sm={6}>
          <TextField
            label="Hora de apertura"
            type="time"
            value={s.open_time.slice(0, 5)}
            onChange={set("open_time")}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Hora de cierre"
            type="time"
            value={s.close_time.slice(0, 5)}
            onChange={set("close_time")}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            label="Duración del bloque (min)"
            type="number"
            value={s.block_minutes}
            onChange={set("block_minutes")}
            helperText="Afecta la agenda y el cálculo del cronómetro"
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Retención reservas en línea (min)"
            type="number"
            value={s.online_hold_minutes}
            onChange={set("online_hold_minutes")}
            helperText="Tiempo que un cliente tiene para pagar antes de vencer"
            fullWidth
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            label="Cancelación mínima (horas)"
            type="number"
            value={s.min_cancel_hours}
            onChange={set("min_cancel_hours")}
            helperText="Anticipación mínima del cliente para cancelar"
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={6} />

        <Grid item xs={12}>
          <Button type="submit" variant="contained" startIcon={<Save />}>
            Guardar
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
}

/* ------------------------------------------------------------------ */
/* Canchas — crear, editar y eliminar                                  */
/* ------------------------------------------------------------------ */
function Courts() {
  const notify = useNotify();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    status: "activa",
  });
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await API.get("/courts");
      setRows(r.data.data);
    } catch (e) {
      notify(errMsg(e), "error");
    }
  }, [notify]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    try {
      await API.post("/courts", form);
      notify("Cancha creada", "success");
      setForm({ name: "", description: "", status: "activa" });
      load();
    } catch (e) {
      notify(errMsg(e), "error");
    }
  };

  const openEdit = (court) => {
    setEditForm({ ...court });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    setBusy(true);
    try {
      await API.put(`/courts/${editForm.id}`, {
        name: editForm.name,
        description: editForm.description,
        status: editForm.status,
      });
      notify("Cancha actualizada", "success");
      setEditOpen(false);
      setEditForm(null);
      load();
    } catch (e) {
      notify(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };

  const del = async (court) => {
    if (
      !window.confirm(
        `¿Eliminar la cancha "${court.name}"? Solo funciona si no tiene reservas históricas.`,
      )
    )
      return;
    try {
      await API.delete(`/courts/${court.id}`);
      notify("Cancha eliminada", "success");
      load();
    } catch (e) {
      notify(errMsg(e), "error");
    }
  };

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <TextField
          size="small"
          label="Nombre"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <TextField
          size="small"
          label="Descripción"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          sx={{ flexGrow: 1 }}
        />
        <TextField
          size="small"
          select
          label="Estado"
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="activa">Activa</MenuItem>
          <MenuItem value="inactiva">Inactiva</MenuItem>
          <MenuItem value="mantenimiento">Mantenimiento</MenuItem>
        </TextField>
        <Button variant="contained" onClick={save}>
          Agregar
        </Button>
      </Stack>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Nombre</TableCell>
            <TableCell>Descripción</TableCell>
            <TableCell>Estado</TableCell>
            <TableCell align="right">Acciones</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((c) => (
            <TableRow key={c.id}>
              <TableCell>{c.name}</TableCell>
              <TableCell>{c.description ?? "—"}</TableCell>
              <TableCell>{c.status}</TableCell>
              <TableCell align="right">
                <IconButton size="small" onClick={() => openEdit(c)}>
                  <Edit fontSize="small" />
                </IconButton>
                <IconButton size="small" color="error" onClick={() => del(c)}>
                  <Delete fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog
        open={editOpen}
        onClose={() => (busy ? null : setEditOpen(false))}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Editar cancha</DialogTitle>
        <DialogContent>
          {editForm && (
            <Stack spacing={2} mt={1}>
              <TextField
                label="Nombre"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
                fullWidth
              />
              <TextField
                label="Descripción"
                value={editForm.description ?? ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, description: e.target.value })
                }
                fullWidth
              />
              <TextField
                select
                label="Estado"
                value={editForm.status}
                onChange={(e) =>
                  setEditForm({ ...editForm, status: e.target.value })
                }
                fullWidth
              >
                <MenuItem value="activa">Activa</MenuItem>
                <MenuItem value="inactiva">Inactiva</MenuItem>
                <MenuItem value="mantenimiento">Mantenimiento</MenuItem>
              </TextField>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={saveEdit} disabled={busy}>
            {busy ? "Guardando…" : "Guardar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

/* ------------------------------------------------------------------ */
/* Tarifas                                                             */
/* ------------------------------------------------------------------ */
function Rates() {
  const notify = useNotify();
  const [rows, setRows] = useState([]);
  const [courts, setCourts] = useState([]);
  const [form, setForm] = useState({
    court_id: "all",
    day_type: "semana",
    start_time: "08:00",
    end_time: "18:00",
    price: 50000,
  });

  const load = useCallback(async () => {
    try {
      const [r, c] = await Promise.all([API.get("/rates"), API.get("/courts")]);
      setRows(r.data.data);
      setCourts(c.data.data);
    } catch (e) {
      notify(errMsg(e), "error");
    }
  }, [notify]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    try {
      await API.post("/rates", {
        ...form,
        court_id: form.court_id === "all" ? null : Number(form.court_id),
        price: Number(form.price),
      });
      notify("Tarifa creada", "success");
      load();
    } catch (e) {
      notify(errMsg(e), "error");
    }
  };

  const del = async (id) => {
    if (!window.confirm("¿Eliminar tarifa?")) return;
    try {
      await API.delete(`/rates/${id}`);
      notify("Eliminada", "success");
      load();
    } catch (e) {
      notify(errMsg(e), "error");
    }
  };

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1}
        flexWrap="wrap"
      >
        <TextField
          size="small"
          select
          label="Cancha"
          value={form.court_id}
          onChange={(e) => setForm({ ...form, court_id: e.target.value })}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="all">Todas</MenuItem>
          {courts.map((c) => (
            <MenuItem key={c.id} value={String(c.id)}>
              {c.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          select
          label="Día"
          value={form.day_type}
          onChange={(e) => setForm({ ...form, day_type: e.target.value })}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="semana">Semana</MenuItem>
          <MenuItem value="finde">Fin de semana</MenuItem>
        </TextField>
        <TextField
          size="small"
          type="time"
          label="Desde"
          value={form.start_time}
          onChange={(e) => setForm({ ...form, start_time: e.target.value })}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 120 }}
        />
        <TextField
          size="small"
          type="time"
          label="Hasta"
          value={form.end_time}
          onChange={(e) => setForm({ ...form, end_time: e.target.value })}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 120 }}
        />
        <TextField
          size="small"
          type="number"
          label="Precio"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
          sx={{ minWidth: 130 }}
        />
        <Button variant="contained" onClick={save}>
          Agregar
        </Button>
      </Stack>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Cancha</TableCell>
            <TableCell>Día</TableCell>
            <TableCell>Desde</TableCell>
            <TableCell>Hasta</TableCell>
            <TableCell align="right">Precio</TableCell>
            <TableCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{r.court_name ?? "Todas"}</TableCell>
              <TableCell>{r.day_type}</TableCell>
              <TableCell>{r.start_time.slice(0, 5)}</TableCell>
              <TableCell>{r.end_time.slice(0, 5)}</TableCell>
              <TableCell align="right">{fmtMoney(r.price)}</TableCell>
              <TableCell>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => del(r.id)}
                >
                  <Delete fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Stack>
  );
}

/* ------------------------------------------------------------------ */
/* Bloqueos de mantenimiento                                           */
/* ------------------------------------------------------------------ */
function Blocks() {
  const notify = useNotify();
  const [date, setDate] = useState(() => {
    const f = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Bogota",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return f.format(new Date());
  });
  const [available, setAvailable] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const [dlg, setDlg] = useState(null);
  const [reason, setReason] = useState("Mantenimiento");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const availRes = await API.get("/availability", { params: { date } });
      const avail = [];
      const curr = [];
      for (const c of availRes.data.data.courts || []) {
        for (const b of c.blocks || []) {
          if (b.status === "bloqueado") {
            curr.push({ court: c, block: b });
          } else if (b.status === "disponible") {
            avail.push({ court: c, block: b });
          }
        }
      }
      setAvailable(avail);
      setBlocks(curr);
    } catch (e) {
      notify(errMsg(e), "error");
    } finally {
      setLoading(false);
    }
  }, [date, notify]);

  useEffect(() => {
    load();
  }, [load]);

  const openBlock = (court, block) => {
    setDlg({ court, block });
    setReason("Mantenimiento");
  };

  const submitBlock = async () => {
    setBusy(true);
    try {
      await API.post("/blocks", {
        court_id: dlg.court.id,
        date,
        start_time: dlg.block.start,
        reason: reason || "Mantenimiento",
      });
      notify("Bloqueo creado", "success");
      setDlg(null);
      load();
    } catch (e) {
      notify(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };

  const unblock = async (slotId) => {
    if (!window.confirm("¿Desbloquear este horario?")) return;
    try {
      await API.delete(`/blocks/${slotId}`);
      notify("Bloqueo eliminado", "success");
      load();
    } catch (e) {
      notify(errMsg(e), "error");
    }
  };

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems="center"
      >
        <TextField
          size="small"
          type="date"
          label="Fecha"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
        <Button onClick={load} disabled={loading}>
          {loading ? "Cargando…" : "Actualizar"}
        </Button>
      </Stack>

      <Box>
        <Typography variant="h6" gutterBottom>
          Bloqueos activos del día
        </Typography>
        {blocks.length === 0 ? (
          <Typography color="text.secondary">
            Sin bloqueos en la fecha seleccionada.
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Cancha</TableCell>
                <TableCell>Bloque</TableCell>
                <TableCell>Motivo</TableCell>
                <TableCell align="right">Acción</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {blocks.map((b) => (
                <TableRow key={b.block.slot_id}>
                  <TableCell>{b.court.name}</TableCell>
                  <TableCell>
                    {fmtTime(b.block.start)} – {fmtTime(b.block.end)}
                  </TableCell>
                  <TableCell>{b.block.reason || "—"}</TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      color="error"
                      variant="outlined"
                      onClick={() => unblock(b.block.slot_id)}
                    >
                      Desbloquear
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Box>

      <Box>
        <Typography variant="h6" gutterBottom>
          Bloquear un horario
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={1}>
          Elige una cancha y un bloque disponible de la fecha seleccionada.
        </Typography>
        {available.length === 0 ? (
          <Typography color="text.secondary">
            No hay bloques disponibles para bloquear.
          </Typography>
        ) : (
          <Stack spacing={1}>
            {available.map((a) => (
              <Stack
                key={`${a.court.id}|${a.block.start}`}
                direction="row"
                spacing={2}
                alignItems="center"
              >
                <Typography sx={{ minWidth: 90 }}>{a.court.name}</Typography>
                <Typography sx={{ minWidth: 130 }}>
                  {fmtTime(a.block.start)} – {fmtTime(a.block.end)}
                </Typography>
                <Button
                  size="small"
                  startIcon={<Block />}
                  variant="outlined"
                  color="warning"
                  onClick={() => openBlock(a.court, a.block)}
                >
                  Bloquear
                </Button>
              </Stack>
            ))}
          </Stack>
        )}
      </Box>

      <Dialog
        open={Boolean(dlg)}
        onClose={() => (busy ? null : setDlg(null))}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Bloquear horario</DialogTitle>
        <DialogContent>
          {dlg && (
            <Stack spacing={2} mt={1}>
              <Typography variant="body2">
                {dlg.court.name} · {fmtDate(date)} · {fmtTime(dlg.block.start)}{" "}
                – {fmtTime(dlg.block.end)}
              </Typography>
              <TextField
                label="Motivo"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                fullWidth
                multiline
                minRows={2}
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDlg(null)} disabled={busy}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={submitBlock}
            disabled={busy}
          >
            {busy ? "Bloqueando…" : "Bloquear"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
