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

const today = () => {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date());
};

const STYLES = {
  disponible: { bg: "#C8E6C9", fg: "#1B5E20", bd: "#4CAF50" },
  procesando: { bg: "#FFF9C4", fg: "#E65100", bd: "#FBC02D" },
  ocupado: { bg: "#FFCDD2", fg: "#B71C1C", bd: "#E53935" },
  bloqueado: { bg: "#E0E0E0", fg: "#424242", bd: "#9E9E9E" },
  pasado: { bg: "#F5F5F5", fg: "#9E9E9E", bd: "#E0E0E0" },
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
  const [mode, setMode] = useState("book"); // "book" | "block"
  const [customerName, setCustomerName] = useState(user?.name || "");
  const [customerPhone, setCustomerPhone] = useState(user?.phone || "");
  const [reason, setReason] = useState("Mantenimiento");

  useEffect(() => {
    setBusy(false);
    setMode("book");
    setCustomerName(user?.name || "");
    setCustomerPhone(user?.phone || "");
    setReason("Mantenimiento");
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
          "Reserva solicitada. Queda en procesando hasta que el administrador la apruebe.",
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

  const blockSlot = async () => {
    setBusy(true);
    try {
      await API.post("/blocks", {
        court_id: court.id,
        date,
        start_time: block.start,
        reason: reason || "Mantenimiento",
      });
      notify("Horario bloqueado por mantenimiento", "success");
      onDone();
    } catch (e) {
      notify(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>
        {mode === "block" ? `Bloquear ${court.name}` : `Reservar ${court.name}`}
      </DialogTitle>
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

          {isAdmin && mode === "book" && (
            <Button
              size="small"
              variant="outlined"
              color="warning"
              onClick={() => setMode("block")}
            >
              Cambiar a "Bloquear por mantenimiento"
            </Button>
          )}

          {mode === "book" && (
            <>
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
                Quedará en <b>procesando</b>. En "Reservas" registras el pago y
                la apruebas para que pase a <b>ocupada</b>.
              </Typography>
            </>
          )}

          {mode === "block" && (
            <>
              <TextField
                label="Motivo del bloqueo"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                fullWidth
                multiline
                minRows={2}
              />
              <Typography variant="caption" color="text.secondary">
                El bloque aparecerá como <b>Mantenimiento</b> en gris y no se
                podrá reservar hasta que se desbloquee desde Configuración →
                Bloqueos.
              </Typography>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setMode("book")}
              >
                Volver a "Reservar"
              </Button>
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Cancelar
        </Button>
        {mode === "book" ? (
          <Button variant="contained" onClick={book} disabled={busy}>
            {busy ? "Creando…" : "Crear reserva"}
          </Button>
        ) : (
          <Button
            variant="contained"
            color="warning"
            onClick={blockSlot}
            disabled={busy}
          >
            {busy ? "Bloqueando…" : "Bloquear horario"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
