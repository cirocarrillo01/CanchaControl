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
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { Delete, Edit, Lock, Save } from "@mui/icons-material";
import API, { errMsg } from "../api/axios";
import { useNotify } from "../context/NotifyContext";
import { fmtDate, fmtMoney, fmtTime } from "../utils/format";

const today = () => {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return f.format(new Date());
};

/* ------------------------------------------------------------------ */
/* Contenedor con pestañas                                             */
/* ------------------------------------------------------------------ */
export default function Config() {
  const [tab, setTab] = useState("settings");
  return (
    <Box sx={{ width: "100%", minWidth: 0 }}>
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
/* General — 2 columnas, responsive, sin desbordar                     */
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
      sx={{ maxWidth: 900 }}
    >
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography variant="subtitle2" color="text.secondary">
            Datos del negocio
          </Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Nombre del negocio"
            value={s.business_name}
            onChange={set("business_name")}
            fullWidth
          />
        </Grid>

        <Grid item xs={12} mt={1}>
          <Typography variant="subtitle2" color="text.secondary">
            Horario de atención
          </Typography>
        </Grid>
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

        <Grid item xs={12} mt={1}>
          <Typography variant="subtitle2" color="text.secondary">
            Bloques y reservas
          </Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Duración del bloque (min)"
            type="number"
            value={s.block_minutes}
            onChange={set("block_minutes")}
            helperText="Afecta la agenda y el cronómetro"
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Retención reservas en línea (min)"
            type="number"
            value={s.online_hold_minutes}
            onChange={set("online_hold_minutes")}
            helperText="Tiempo para pagar antes de vencer"
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Cancelación mínima (horas)"
            type="number"
            value={s.min_cancel_hours}
            onChange={set("min_cancel_hours")}
            helperText="Anticipación mínima del cliente"
            fullWidth
          />
        </Grid>

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
/* Canchas                                                             */
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
      <Grid container spacing={1} alignItems="center">
        <Grid item xs={12} sm={3} md={2}>
          <TextField
            fullWidth
            size="small"
            label="Nombre"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} sm={5} md={6}>
          <TextField
            fullWidth
            size="small"
            label="Descripción"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </Grid>
        <Grid item xs={12} sm={2} md={2}>
          <TextField
            fullWidth
            size="small"
            select
            label="Estado"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            <MenuItem value="activa">Activa</MenuItem>
            <MenuItem value="inactiva">Inactiva</MenuItem>
            <MenuItem value="mantenimiento">Mantenimiento</MenuItem>
          </TextField>
        </Grid>
        <Grid item xs={12} sm={2} md={2}>
          <Button
            variant="contained"
            onClick={save}
            fullWidth
            sx={{ height: 40 }}
          >
            Agregar
          </Button>
        </Grid>
      </Grid>

      <TableContainer>
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
      </TableContainer>

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
      <Grid container spacing={1} alignItems="center">
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            fullWidth
            size="small"
            select
            label="Cancha"
            value={form.court_id}
            onChange={(e) => setForm({ ...form, court_id: e.target.value })}
          >
            <MenuItem value="all">Todas</MenuItem>
            {courts.map((c) => (
              <MenuItem key={c.id} value={String(c.id)}>
                {c.name}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <TextField
            fullWidth
            size="small"
            select
            label="Día"
            value={form.day_type}
            onChange={(e) => setForm({ ...form, day_type: e.target.value })}
          >
            <MenuItem value="semana">Semana</MenuItem>
            <MenuItem value="finde">Fin de semana</MenuItem>
          </TextField>
        </Grid>
        <Grid item xs={6} sm={3} md={1.5}>
          <TextField
            fullWidth
            size="small"
            type="time"
            label="Desde"
            value={form.start_time}
            onChange={(e) => setForm({ ...form, start_time: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={6} sm={3} md={1.5}>
          <TextField
            fullWidth
            size="small"
            type="time"
            label="Hasta"
            value={form.end_time}
            onChange={(e) => setForm({ ...form, end_time: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={6} sm={6} md={2}>
          <TextField
            fullWidth
            size="small"
            type="number"
            label="Precio"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
          />
        </Grid>
        <Grid item xs={6} sm={6} md={2}>
          <Button
            fullWidth
            variant="contained"
            onClick={save}
            sx={{ height: 40 }}
          >
            Agregar
          </Button>
        </Grid>
      </Grid>

      <TableContainer>
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
      </TableContainer>
    </Stack>
  );
}

/* ------------------------------------------------------------------ */
/* Bloqueos — vista tipo calendario por filas                          */
/* ------------------------------------------------------------------ */
const blockStyle = (b) => {
  switch (b.status) {
    case "disponible":
      return {
        bg: "#E8F5E9",
        fg: "#1B5E20",
        bd: "#A5D6A7",
        hover: "#C8E6C9",
        clickable: true,
        label: "Libre",
      };
    case "bloqueado":
      return {
        bg: "#FFE0B2",
        fg: "#E65100",
        bd: "#FFB74D",
        hover: "#FFCC80",
        clickable: true,
        label: "Bloq.",
      };
    case "procesando":
      return {
        bg: "#FFF9C4",
        fg: "#827717",
        bd: "#FFF176",
        clickable: false,
        label: "Proc.",
      };
    case "ocupado":
      return {
        bg: "#FFEBEE",
        fg: "#B71C1C",
        bd: "#EF9A9A",
        clickable: false,
        label: "Ocup.",
      };
    default:
      return {
        bg: "#F5F5F5",
        fg: "#9E9E9E",
        bd: "#E0E0E0",
        clickable: false,
        label: "—",
      };
  }
};

function Blocks() {
  const notify = useNotify();
  const [date, setDate] = useState(today());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const [dlg, setDlg] = useState(null);
  const [reason, setReason] = useState("Mantenimiento");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await API.get("/availability", { params: { date } });
      setData(r.data.data);
    } catch (e) {
      notify(errMsg(e), "error");
    } finally {
      setLoading(false);
    }
  }, [date, notify]);

  useEffect(() => {
    load();
  }, [load]);

  const onClickBlock = (court, block) => {
    if (block.status === "disponible") {
      setDlg({ court, block, mode: "block" });
      setReason("Mantenimiento");
    } else if (block.status === "bloqueado" && block.slot_id) {
      setDlg({ court, block, mode: "unblock" });
    }
  };

  const confirmAction = async () => {
    if (!dlg) return;
    setBusy(true);
    try {
      if (dlg.mode === "block") {
        await API.post("/blocks", {
          court_id: dlg.court.id,
          date,
          start_time: dlg.block.start,
          reason: reason || "Mantenimiento",
        });
        notify("Horario bloqueado", "success");
      } else {
        await API.delete(`/blocks/${dlg.block.slot_id}`);
        notify("Bloqueo eliminado", "success");
      }
      setDlg(null);
      load();
    } catch (e) {
      notify(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };

  const courts = data?.courts ?? [];

  return (
    <Stack spacing={2}>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={6} sm={4} md={2}>
          <TextField
            fullWidth
            size="small"
            type="date"
            label="Fecha"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={6} sm={3} md={2}>
          <Button
            fullWidth
            variant="outlined"
            onClick={load}
            disabled={loading}
            sx={{ height: 40 }}
          >
            {loading ? "Cargando…" : "Actualizar"}
          </Button>
        </Grid>
        <Grid item xs={12} md={8}>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            <LegendDot
              color="#E8F5E9"
              border="#A5D6A7"
              label="Disponible (clic para bloquear)"
            />
            <LegendDot
              color="#FFE0B2"
              border="#FFB74D"
              label="Bloqueado (clic para desbloquear)"
            />
            <LegendDot color="#FFF9C4" border="#FFF176" label="En proceso" />
            <LegendDot color="#FFEBEE" border="#EF9A9A" label="Ocupado" />
            <LegendDot color="#F5F5F5" border="#E0E0E0" label="Pasado" />
          </Stack>
        </Grid>
      </Grid>

      {!data && <CircularProgress />}

      {courts.map((court) => (
        <Card key={court.id} variant="outlined">
          <CardContent sx={{ py: 1.5 }}>
            <Typography variant="subtitle1" fontWeight={600} mb={1}>
              {court.name}{" "}
              <Typography
                component="span"
                variant="caption"
                color="text.secondary"
              >
                · {fmtDate(date)}
              </Typography>
            </Typography>
            <Box
              sx={{
                display: "grid",
                gap: 0.75,
                gridTemplateColumns: {
                  xs: "repeat(auto-fill, minmax(74px, 1fr))",
                  sm: "repeat(auto-fill, minmax(84px, 1fr))",
                  md: "repeat(auto-fill, minmax(92px, 1fr))",
                  lg: "repeat(auto-fill, minmax(100px, 1fr))",
                },
              }}
            >
              {court.blocks.map((b) => {
                const s = blockStyle(b);
                return (
                  <Tooltip
                    key={b.start}
                    title={
                      b.status === "bloqueado" && b.reason
                        ? `Motivo: ${b.reason}`
                        : s.label
                    }
                    arrow
                  >
                    <Box
                      onClick={() => onClickBlock(court, b)}
                      sx={{
                        px: 0.5,
                        py: 0.75,
                        borderRadius: 1,
                        border: "1px solid",
                        borderColor: s.bd,
                        bgcolor: s.bg,
                        color: s.fg,
                        textAlign: "center",
                        cursor: s.clickable ? "pointer" : "default",
                        transition:
                          "transform 0.12s ease, box-shadow 0.12s ease",
                        opacity:
                          b.status === "pasado" || b.status === "ocupado"
                            ? 0.65
                            : 1,
                        "&:hover": s.clickable
                          ? {
                              bgcolor: s.hover,
                              transform: "translateY(-1px)",
                              boxShadow: 2,
                            }
                          : {},
                        userSelect: "none",
                      }}
                    >
                      <Typography
                        variant="caption"
                        fontWeight={700}
                        display="block"
                        noWrap
                      >
                        {fmtTime(b.start)}
                      </Typography>
                      <Stack
                        direction="row"
                        justifyContent="center"
                        alignItems="center"
                        spacing={0.25}
                      >
                        {b.status === "bloqueado" && (
                          <Lock sx={{ fontSize: 11 }} />
                        )}
                        <Typography
                          variant="caption"
                          fontSize={10}
                          display="block"
                          noWrap
                        >
                          {s.label}
                        </Typography>
                      </Stack>
                    </Box>
                  </Tooltip>
                );
              })}
            </Box>
          </CardContent>
        </Card>
      ))}

      {data && courts.length === 0 && (
        <Typography color="text.secondary">
          No hay canchas activas para mostrar.
        </Typography>
      )}

      <Dialog
        open={Boolean(dlg)}
        onClose={() => (busy ? null : setDlg(null))}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          {dlg?.mode === "block" ? "Bloquear horario" : "Desbloquear horario"}
        </DialogTitle>
        <DialogContent>
          {dlg && (
            <Stack spacing={2} mt={1}>
              <Typography variant="body2">
                <b>{dlg.court.name}</b> · {fmtDate(date)} ·{" "}
                {fmtTime(dlg.block.start)} – {fmtTime(dlg.block.end)}
              </Typography>
              {dlg.mode === "block" ? (
                <TextField
                  label="Motivo"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  fullWidth
                  multiline
                  minRows={2}
                />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  El bloque volverá a estar disponible para reservar.
                  {dlg.block.reason && (
                    <>
                      {" "}
                      Motivo actual: <b>{dlg.block.reason}</b>
                    </>
                  )}
                </Typography>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDlg(null)} disabled={busy}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color={dlg?.mode === "block" ? "warning" : "primary"}
            onClick={confirmAction}
            disabled={busy}
          >
            {busy
              ? "Procesando…"
              : dlg?.mode === "block"
                ? "Bloquear"
                : "Desbloquear"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

function LegendDot({ color, border, label }) {
  return (
    <Stack direction="row" alignItems="center" spacing={0.5}>
      <Box
        sx={{
          width: 14,
          height: 14,
          borderRadius: 0.5,
          bgcolor: color,
          border: "1px solid",
          borderColor: border,
        }}
      />
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Stack>
  );
}
