// frontend/src/pages/Config.jsx
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
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
import { Delete, Save } from "@mui/icons-material";
import API, { errMsg } from "../api/axios";
import { useNotify } from "../context/NotifyContext";
import { fmtMoney } from "../utils/format";

export default function Config() {
  const [tab, setTab] = useState("settings");
  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={2}>
        Configuración
      </Typography>
      <Card>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="General" value="settings" />
          <Tab label="Canchas" value="courts" />
          <Tab label="Tarifas" value="rates" />
        </Tabs>
        <CardContent>
          {tab === "settings" && <Settings />}
          {tab === "courts" && <Courts />}
          {tab === "rates" && <Rates />}
        </CardContent>
      </Card>
    </Box>
  );
}

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
    } catch (e) {
      notify(errMsg(e), "error");
    }
  };

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!s) return <CircularProgress />;

  const set = (k) => (e) => setS({ ...s, [k]: e.target.value });
  return (
    <Stack spacing={2} maxWidth={420}>
      <TextField
        label="Nombre del negocio"
        value={s.business_name}
        onChange={set("business_name")}
        fullWidth
      />
      <TextField
        label="Hora de apertura"
        type="time"
        value={s.open_time.slice(0, 5)}
        onChange={set("open_time")}
        InputLabelProps={{ shrink: true }}
        fullWidth
      />
      <TextField
        label="Hora de cierre"
        type="time"
        value={s.close_time.slice(0, 5)}
        onChange={set("close_time")}
        InputLabelProps={{ shrink: true }}
        fullWidth
      />
      <TextField
        label="Duración del bloque (min)"
        type="number"
        value={s.block_minutes}
        onChange={set("block_minutes")}
        fullWidth
      />
      <TextField
        label="Retención reservas en línea (min)"
        type="number"
        value={s.online_hold_minutes}
        onChange={set("online_hold_minutes")}
        fullWidth
      />
      <TextField
        label="Cancelación mínima (horas)"
        type="number"
        value={s.min_cancel_hours}
        onChange={set("min_cancel_hours")}
        fullWidth
      />
      <Button variant="contained" startIcon={<Save />} onClick={save}>
        Guardar
      </Button>
    </Stack>
  );
}

function Courts() {
  const notify = useNotify();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    status: "activa",
  });
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
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((c) => (
            <TableRow key={c.id}>
              <TableCell>{c.name}</TableCell>
              <TableCell>{c.description ?? "—"}</TableCell>
              <TableCell>{c.status}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Stack>
  );
}

function Rates() {
  const notify = useNotify();
  const [rows, setRows] = useState([]);
  const [courts, setCourts] = useState([]);
  const [form, setForm] = useState({
    court_id: "",
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
        court_id: form.court_id || null,
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
        >
          <MenuItem value="">Todas</MenuItem>
          {courts.map((c) => (
            <MenuItem key={c.id} value={c.id}>
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
        />
        <TextField
          size="small"
          type="time"
          label="Hasta"
          value={form.end_time}
          onChange={(e) => setForm({ ...form, end_time: e.target.value })}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          size="small"
          type="number"
          label="Precio"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
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
