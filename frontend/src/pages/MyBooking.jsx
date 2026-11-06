// frontend/src/pages/MyBooking.jsx
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
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import API, { errMsg } from "../api/axios";
import { useNotify } from "../context/NotifyContext";
import { fmtDate, fmtMoney, fmtTime } from "../utils/format";

const STATUS_COLOR = {
  procesando: "warning",
  ocupada: "error",
  en_curso: "primary",
  finalizada: "success",
  cancelada: "default",
  vencida: "default",
};

export default function MyBookings() {
  const notify = useNotify();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await API.get("/bookings/mis-reservas");
      setRows(r.data.data ?? []);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelBooking, setCancelBooking] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelBusy, setCancelBusy] = useState(false);

  const openCancel = (b) => {
    setCancelBooking(b);
    setCancelReason("");
    setCancelOpen(true);
  };

  const submitCancel = async () => {
    setCancelBusy(true);
    try {
      await API.post(`/bookings/${cancelBooking.id}/cancel`, {
        reason: cancelReason || "Cancelada por el cliente",
      });
      notify("Reserva cancelada", "success");
      setCancelOpen(false);
      load();
    } catch (e) {
      notify(errMsg(e), "error");
    } finally {
      setCancelBusy(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={2}>
        Mis reservas
      </Typography>
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
              <TableCell>Código</TableCell>
              <TableCell>Cancha</TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell>Hora</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Sin reservas
                </TableCell>
              </TableRow>
            )}
            {rows.map((b) => (
              <TableRow key={b.id}>
                <TableCell>
                  <b>{b.code}</b>
                </TableCell>
                <TableCell>{b.court_name}</TableCell>
                <TableCell>{fmtDate(b.date)}</TableCell>
                <TableCell>{fmtTime(b.start_time)}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={b.status}
                    color={STATUS_COLOR[b.status] ?? "default"}
                  />
                </TableCell>
                <TableCell align="right">{fmtMoney(b.price_total)}</TableCell>
                <TableCell>
                  {["procesando", "ocupada"].includes(b.status) && b.payment_status === "pendiente" && (
                    <Button
                      size="small"
                      color="error"
                      onClick={() => openCancel(b)}
                    >
                      Cancelar
                    </Button>
                  )}
                  {b.payment_status !== "pendiente" && (
                    <Button
                      size="small"
                      color="default"
                      disabled
                      title="Contacta al administrador para solicitar un reembolso"
                    >
                      Contactar admin
                    </Button>
                  )}
                  {["cancelada", "finalizada", "vencida", "no_show", "reembolsada"].includes(b.status) && (
                    <Chip size="small" label={b.status} color="default" variant="outlined" />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Modal de cancelación para Cliente */}
      <Dialog
        open={cancelOpen}
        onClose={() => (cancelBusy ? null : setCancelOpen(false))}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ bgcolor: 'error.main', color: 'white', mb: 2 }}>
          Cancelar Reserva
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Alert severity="warning">
              ¿Estás seguro de cancelar esta reserva? El turno quedará disponible nuevamente.
            </Alert>

            <Box sx={{ p: 2, bgcolor: '#f9f9f9', borderRadius: 1 }}>
              <Typography variant="body2"><b>Reserva:</b> {cancelBooking?.code}</Typography>
              <Typography variant="body2"><b>Cancha:</b> {cancelBooking?.court_name}</Typography>
              <Typography variant="body2"><b>Fecha:</b> {fmtDate(cancelBooking?.date)} · {fmtTime(cancelBooking?.start_time)}</Typography>
              <Typography variant="body2"><b>Total:</b> {fmtMoney(cancelBooking?.price_total)}</Typography>
            </Box>

            <TextField
              label="Motivo de la cancelación"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              fullWidth
              multiline
              minRows={2}
              autoFocus
              placeholder="Ej: Ya no podré asistir"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCancelOpen(false)} disabled={cancelBusy}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={submitCancel}
            disabled={cancelBusy}
            startIcon={cancelBusy ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {cancelBusy ? "Procesando…" : "Aceptar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
