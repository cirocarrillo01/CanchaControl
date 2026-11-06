// frontend/src/pages/Timers.jsx
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import API, { errMsg } from "../api/axios";
import { useNotify } from "../context/NotifyContext";
import { fmtDate, fmtMoney, fmtTime, statusLabel } from "../utils/format";

const mmss = (s) => {
  s = Math.max(0, Math.floor(s));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

export default function Timers() {
  const notify = useNotify();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadedAt, setLoadedAt] = useState(Date.now());
  const [, setTick] = useState(0);

  const [extOpen, setExtOpen] = useState(false);
  const [extType, setExtType] = useState(null);
  const [extItem, setExtItem] = useState(null);
  const [extPassword, setExtPassword] = useState("");
  const [extMinutes, setExtMinutes] = useState(30);
  const [extAmount, setExtAmount] = useState("");
  const [extMethod, setExtMethod] = useState("efectivo");
  const [extBusy, setExtBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    // NO limpiamos error aquí para que se vea si falla
    try {
      const r = await API.get("/bookings/timers");
      setData(r.data.data ?? []);
      setLoadedAt(Date.now());
      setError(""); // Solo limpiamos error si tuvo éxito
    } catch (e) {
      setError(errMsg(e));
      // IMPORTANTE: NO hacemos setData([]) — conservamos último estado bueno
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const i = setInterval(load, 5_000);
    return () => clearInterval(i);
  }, [load]);

  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 1_000);
    return () => clearInterval(i);
  }, []);

  const elapsed = Math.floor((Date.now() - loadedAt) / 1000);

  const openExtension = (type, item) => {
    setExtType(type);
    setExtItem(item);
    setExtPassword("");
    setExtMinutes(30);
    setExtAmount(String(item.next_block?.price ?? 0));
    setExtMethod("efectivo");
    setExtOpen(true);
  };

  const submitExtension = async () => {
    if (!extPassword) {
      notify("Ingresa tu contraseña de administrador", "error");
      return;
    }
    if (!extAmount || Number(extAmount) <= 0) {
      notify("Monto inválido", "error");
      return;
    }
    if (extType === "extra" && (!extMinutes || Number(extMinutes) <= 0)) {
      notify("Minutos inválidos", "error");
      return;
    }

    setExtBusy(true);
    try {
      if (extType === "next") {
        await API.post(`/bookings/${extItem.booking.id}/add-next`, {
          amount: Number(extAmount),
          method: extMethod,
          admin_password: extPassword,
        });
        notify("Bloque siguiente asignado y pago registrado", "success");
      } else {
        await API.post(`/bookings/${extItem.booking.id}/extra-time`, {
          minutes: Number(extMinutes),
          amount: Number(extAmount),
          method: extMethod,
          admin_password: extPassword,
        });
        notify("Tiempo extra agregado y pago registrado", "success");
      }
      setExtOpen(false);
      load();
    } catch (e) {
      notify(errMsg(e), "error");
    } finally {
      setExtBusy(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={2}>
        Cronómetros
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Error al cargar cronómetros: {error}. Las canchas pueden estar operando pero el sistema no las muestra.
        </Alert>
      )}

      {loading && data.length === 0 ? (
        <CircularProgress />
      ) : (
        <>
          {data.length > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
              {data.filter(c => c.court_status === "activa").length} activa(s) ·{" "}
              {data.filter(c => c.court_status === "mantenimiento").length} en mantenimiento
            </Typography>
          )}
          <Stack direction="row" flexWrap="wrap" gap={2}>
            {data.length === 0 && !error && (
              <Typography color="text.secondary">
                No hay canchas activas configuradas.
              </Typography>
            )}
            {data.map((item) => (
              <CourtCard
                key={item.court_id}
                item={item}
                elapsed={elapsed}
                onAddNext={() => openExtension("next", item)}
                onExtra={() => openExtension("extra", item)}
              />
            ))}
          </Stack>
        </>
      )}

      <Dialog
        open={extOpen}
        onClose={() => (extBusy ? null : setExtOpen(false))}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          {extType === "next" ? "Asignar bloque siguiente" : "Tiempo extra"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <Typography variant="body2">
              {extItem?.court_name} · Reserva <b>{extItem?.booking?.code}</b>
            </Typography>
            <Typography variant="body2">
              Bloque siguiente: {fmtDate(extItem?.next_block?.date)} ·{" "}
              {fmtTime(extItem?.next_block?.start)} –{" "}
              {fmtTime(extItem?.next_block?.end)} ·{" "}
              <b>{extItem?.next_block?.free ? "Libre" : "Ocupado"}</b>
            </Typography>

            {extType === "extra" && (
              <TextField
                label="Minutos extra"
                type="number"
                value={extMinutes}
                onChange={(e) => setExtMinutes(e.target.value)}
                fullWidth
              />
            )}

            <TextField
              label="Monto a cobrar"
              type="number"
              value={extAmount}
              onChange={(e) => setExtAmount(e.target.value)}
              fullWidth
              helperText="Se registra como pago de tiempo adicional."
            />

            <TextField
              select
              label="Método de pago"
              value={extMethod}
              onChange={(e) => setExtMethod(e.target.value)}
              fullWidth
            >
              <MenuItem value="efectivo">Efectivo</MenuItem>
              <MenuItem value="transferencia">Transferencia</MenuItem>
              <MenuItem value="tarjeta">Tarjeta</MenuItem>
            </TextField>

            <TextField
              label="Contraseña del administrador"
              type="password"
              value={extPassword}
              onChange={(e) => setExtPassword(e.target.value)}
              fullWidth
              required
              autoFocus
              helperText="Necesaria para confirmar la extensión."
            />

            <Typography variant="caption" color="text.secondary">
              La extensión y el pago se registran juntos: si el pago no se
              completa, la extensión no se aplica.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExtOpen(false)} disabled={extBusy}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={submitExtension}
            disabled={extBusy}
          >
            {extBusy
              ? "Procesando…"
              : extType === "next"
                ? "Asignar y pagar"
                : "Agregar y pagar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function CourtCard({ item, elapsed, onAddNext, onExtra }) {
  const isFree = item.phase === "free";
  const isUpcoming = item.phase === "upcoming";
  const isActive = item.phase === "active";
  const isFinished = item.phase === "finished";
  const isMaintenance = item.court_status === "mantenimiento";
  const showCountdown = (isUpcoming || isActive) && item.is_today;

  const remaining = Math.max(
    0,
    (item.remaining_seconds ?? 0) - (showCountdown ? elapsed : 0),
  );

  // ← FIX: overtime congelado (el backend ya no lo devuelve; siempre 0)
  const overtime = item.overtime_seconds ?? 0;

  let color = "primary";
  if (isFinished) color = "error";
  else if (isActive && remaining < 5 * 60) color = "warning";

  const nextFree = Boolean(item.next_block?.free);
  const canExtend = (isActive || isFinished) && item.booking && !isMaintenance;

  const progress =
    isActive && item.total_seconds
      ? Math.max(0, Math.min(100, (remaining / item.total_seconds) * 100))
      : 0;

  return (
    <Card
      sx={{ width: 320, border: isFinished ? "2px solid #d32f2f" : undefined }}
    >
      <CardContent>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="baseline"
        >
          <Typography variant="h6" fontWeight={600}>
            {item.court_name}
          </Typography>
          {isMaintenance && (
            <Chip size="small" label="Mantenimiento" color="warning" />
          )}
          {!isFree && !isMaintenance && (
            <Chip
              size="small"
              label={
                isActive
                  ? "Vigente"
                  : isFinished
                    ? "Finalizada"
                    : isUpcoming
                      ? "Próximo"
                      : statusLabel(item.status)
              }
              color={isFinished ? "error" : isActive ? "primary" : "default"}
            />
          )}
        </Stack>

        {isMaintenance && (
          <Typography color="text.secondary" align="center" sx={{ my: 3 }}>
            Cancha en mantenimiento — sin turnos
          </Typography>
        )}

        {isFree && (
          <Typography color="text.secondary" align="center" sx={{ my: 3 }}>
            Sin turno activo
          </Typography>
        )}

        {!isFree && item.booking && (
          <>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
            >
              {fmtDate(item.date)} · {fmtTime(item.start_time)} –{" "}
              {fmtTime(item.end_time)}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
            >
              {item.booking.code} · {item.booking.customer_name}
              {item.booking.customer_phone
                ? ` · ${item.booking.customer_phone}`
                : ""}
            </Typography>

            {isUpcoming && showCountdown && (
              <>
                <Typography
                  variant="h4"
                  align="center"
                  color="text.secondary"
                  sx={{ my: 2, fontFamily: "monospace" }}
                >
                  {mmss(remaining)}
                </Typography>
                <Typography
                  variant="caption"
                  display="block"
                  textAlign="center"
                  color="text.secondary"
                >
                  Comienza a las {fmtTime(item.start_time)}
                </Typography>
              </>
            )}

            {isUpcoming && !item.is_today && (
              <>
                <Typography variant="h5" align="center" sx={{ mt: 2 }}>
                  {fmtDate(item.date)}
                </Typography>
                <Typography variant="h4" align="center" color="text.secondary">
                  {fmtTime(item.start_time)}
                </Typography>
                <Typography
                  variant="caption"
                  display="block"
                  textAlign="center"
                  color="text.secondary"
                >
                  Próximo turno
                </Typography>
              </>
            )}

            {isActive && (
              <>
                <Typography
                  variant="h3"
                  align="center"
                  color={color}
                  sx={{ my: 1, fontFamily: "monospace" }}
                >
                  {mmss(remaining)}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  color={color}
                  value={progress}
                />
                <Typography
                  variant="caption"
                  display="block"
                  textAlign="center"
                  mt={1}
                  color="text.secondary"
                >
                  Termina a las {fmtTime(item.end_time)}
                </Typography>
              </>
            )}

            {isFinished && (
              <>
                <Typography
                  variant="h4"
                  align="center"
                  color="error"
                  sx={{ my: 1, fontFamily: "monospace" }}
                >
                  +{mmss(overtime)}
                </Typography>
                <Typography
                  variant="caption"
                  display="block"
                  textAlign="center"
                  color="error"
                >
                  Tiempo finalizado · {fmtTime(item.end_time)}
                </Typography>
              </>
            )}

            {canExtend && (
              <Stack spacing={1} mt={2}>
                <Typography variant="caption" color="text.secondary">
                  Siguiente bloque: {fmtDate(item.next_block.date)} ·{" "}
                  {fmtTime(item.next_block.start)} –{" "}
                  {fmtTime(item.next_block.end)} ·{" "}
                  <b style={{ color: nextFree ? "#1B5E20" : "#B71C1C" }}>
                    {nextFree ? "Libre" : "Ocupado"}
                  </b>
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={!nextFree}
                  onClick={onAddNext}
                >
                  Asignar bloque siguiente
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="warning"
                  disabled={!nextFree}
                  onClick={onExtra}
                >
                  Tiempo extra
                </Button>
                {!nextFree && (
                  <Typography variant="caption" color="error">
                    No se puede extender: el siguiente bloque ya está ocupado.
                  </Typography>
                )}
                {nextFree && (
                  <Typography variant="caption" color="text.secondary">
                    Precio del siguiente bloque:{" "}
                    {fmtMoney(item.next_block.price)}
                  </Typography>
                )}
              </Stack>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
