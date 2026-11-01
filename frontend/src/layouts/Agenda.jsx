// frontend/src/layouts/Agenda.jsx
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
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import API, { errMsg } from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useNotify } from "../context/NotifyContext";
import { fmtMoney, fmtTime } from "../utils/format";

const today = () => new Date().toISOString().slice(0, 10);

// ← FIX: colores explícitos aplicados vía sx para que se vean incluso
//         cuando el ToggleButton está deshabilitado (MUI ignora `color` ahí).
const STYLES = {
  disponible: { bg: "#C8E6C9", fg: "#1B5E20", bd: "#4CAF50" }, // verde
  procesando: { bg: "#FFF9C4", fg: "#E65100", bd: "#FBC02D" }, // amarillo
  ocupado: { bg: "#FFCDD2", fg: "#B71C1C", bd: "#E53935" }, // rojo
  bloqueado: { bg: "#E0E0E0", fg: "#424242", bd: "#9E9E9E" }, // gris (mantenimiento)
  pasado: { bg: "#F5F5F5", fg: "#9E9E9E", bd: "#E0E0E0" }, // gris claro
};

const statusLabel = (s) =>
  ({
    disponible: "Disponible",
    procesando: "Procesando",
    ocupado: "Ocupada",
    bloqueado: "Mantenimiento",
    pasado: "Pasado",
  })[s] ?? s;

export default function Agenda() {
  const { user } = useAuth();
  const notify = useNotify();
  const [date, setDate] = useState(today());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [picker, setPicker] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const cleanDate = date ? String(date).replace(/[^\d-]/g, "") : today();
      const r = await API.get("/availability", { params: { date: cleanDate } });
      setData(r.data.data);
    } catch (e) {
      setError(errMsg(e, "No se pudo cargar la agenda"));
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  const openBook = (court, block) => {
    if (!user) {
      notify("Inicia sesión para reservar", "warning");
      return;
    }
    if (user.role !== "cliente" && user.role !== "administrador") {
      notify("Tu rol no puede reservar desde aquí", "warning");
      return;
    }
    setPicker({ court, block });
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={2} mb={2}>
        <Typography variant="h5" fontWeight={700}>
          Agenda
        </Typography>
        <TextField
          type="date"
          size="small"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          inputProps={{ min: today() }}
        />
        <Button onClick={load} size="small">
          Actualizar
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {loading && <CircularProgress />}

      {data && (
        <Stack spacing={3}>
          {data.courts.map((court) => (
            <Card key={court.id}>
              <CardContent>
                <Typography variant="h6" fontWeight={600}>
                  {court.name}
                </Typography>
                <Box
                  sx={{
                    display: "grid",
                    gap: 1,
                    gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))",
                    mt: 1.5,
                  }}
                >
                  {court.blocks.map((b) => {
                    const c = STYLES[b.status] ?? STYLES.pasado;
                    return (
                      <Box key={b.start}>
                        <ToggleButtonGroup fullWidth size="small" exclusive>
                          <ToggleButton
                            value="x"
                            disabled={b.status !== "disponible"}
                            onClick={() => openBook(court, b)}
                            sx={{
                              flexDirection: "column",
                              py: 1,
                              textTransform: "none",
                              border: "1px solid",
                              borderColor: c.bd,
                              bgcolor: c.bg,
                              color: c.fg,
                              "&:hover": { bgcolor: c.bg },
                              // ← clave: MUI aplica opacidad/tono de disabled;
                              //   lo sobrescribimos para mantener el color real.
                              "&.Mui-disabled": {
                                bgcolor: c.bg,
                                color: c.fg,
                                borderColor: c.bd,
                                opacity: 1,
                              },
                            }}
                          >
                            <Typography variant="caption" fontWeight={700}>
                              {fmtTime(b.start)} – {fmtTime(b.end)}
                            </Typography>
                            <Typography variant="caption" sx={{ color: c.fg }}>
                              {b.status === "disponible"
                                ? fmtMoney(b.price)
                                : statusLabel(b.status)}
                            </Typography>
                          </ToggleButton>
                        </ToggleButtonGroup>
                      </Box>
                    );
                  })}
                </Box>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <BookDialog
        picker={picker}
        date={date}
        user={user}
        onClose={() => setPicker(null)}
        onDone={() => {
          setPicker(null);
          load();
        }}
      />
    </Box>
  );
}

function BookDialog({ picker, date, onClose, onDone, user }) {
  const notify = useNotify();
  const [busy, setBusy] = useState(false);
  const [customerName, setCustomerName] = useState(user?.name || "");
  const [customerPhone, setCustomerPhone] = useState(user?.phone || "");

  useEffect(() => {
    setBusy(false);
    setCustomerName(user?.name || "");
    setCustomerPhone(user?.phone || "");
  }, [picker, user]);

  if (!picker) return null;
  const { court, block } = picker;
  const isAdmin = user?.role === "administrador";

  const book = async () => {
    if (!customerPhone) {
      notify("El teléfono es requerido para la reserva", "error");
      return;
    }
    setBusy(true);
    try {
      const res = await API.post("/bookings", {
        court_id: court.id,
        date,
        start_time: block.start,
        customer_name: customerName,
        customer_phone: customerPhone,
      });
      const created = res.data?.data;
      if (isAdmin && created?.code) {
        notify(
          `Reserva ${created.code} creada (procesando). Cobra y aprueba desde "Reservas".`,
          "success",
        );
      } else {
        notify(
          "Reserva solicitada. Queda en estado procesando hasta que el administrador la apruebe.",
          "success",
        );
      }
      onDone();
    } catch (e) {
      notify(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };

  if (isAdmin) {
    return (
      <Dialog open onClose={onClose} fullWidth maxWidth="xs">
        <DialogTitle>Reservar {court.name}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <Typography>
              Fecha: <b>{date}</b> · Hora:{" "}
              <b>
                {fmtTime(block.start)} – {fmtTime(block.end)}
              </b>
            </Typography>
            <Typography>
              Valor: <b>{fmtMoney(block.price)}</b>
            </Typography>
            <TextField
              label="Nombre del cliente"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              fullWidth
            />
            <TextField
              label="Teléfono del cliente"
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              fullWidth
            />
            <Typography variant="caption" color="text.secondary">
              Se creará en estado <b>procesando</b> (amarillo). En "Reservas"
              registras el pago y la apruebas para que pase a <b>ocupada</b>{" "}
              (rojo).
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={book} disabled={busy}>
            {busy ? "Creando…" : "Crear reserva"}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Reservar {court.name}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <Typography>
            Fecha: <b>{date}</b> · Hora:{" "}
            <b>
              {fmtTime(block.start)} – {fmtTime(block.end)}
            </b>
          </Typography>
          <Typography>
            Valor: <b>{fmtMoney(block.price)}</b>
          </Typography>
          <Typography>
            Cliente: <b>{customerName}</b>
          </Typography>
          <Typography>
            Teléfono: <b>{customerPhone}</b>
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Tu reserva quedará en estado <b>procesando</b> (amarillo) hasta que
            el administrador la apruebe. Al aprobarla se marcará como{" "}
            <b>ocupada</b> (rojo).
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Cancelar
        </Button>
        <Button variant="contained" onClick={book} disabled={busy}>
          {busy ? "Solicitando…" : "Solicitar reserva"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
