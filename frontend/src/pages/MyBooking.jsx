// frontend/src/pages/MyBooking.jsx
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
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

  const cancel = async (b) => {
    const reason = window.prompt(
      "Motivo de la cancelación:",
      "Ya no puedo asistir",
    );
    if (reason === null) return;
    try {
      await API.post(`/bookings/${b.id}/cancel`, { reason });
      notify("Reserva cancelada", "success");
      load();
    } catch (e) {
      notify(errMsg(e), "error");
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
                  {["procesando", "ocupada"].includes(b.status) && (
                    <Button
                      size="small"
                      color="error"
                      onClick={() => cancel(b)}
                    >
                      Cancelar
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  );
}
