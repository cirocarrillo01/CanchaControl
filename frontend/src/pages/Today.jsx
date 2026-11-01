// frontend/src/pages/Today.jsx
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
import { fmtMoney, fmtTime } from "../utils/format";

const STATUS_COLOR = {
  procesando: "warning",
  ocupada: "error",
  en_curso: "primary",
  finalizada: "success",
  cancelada: "default",
  vencida: "default",
};

export default function Today() {
  const notify = useNotify();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await API.get("/bookings/today");
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

  const checkIn = async (b) => {
    try {
      await API.post(`/bookings/${b.id}/checkin`);
      notify("Ingreso registrado", "success");
      load();
    } catch (e) {
      notify(errMsg(e), "error");
    }
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" mb={2} spacing={2}>
        <Typography variant="h5" fontWeight={700} sx={{ flexGrow: 1 }}>
          Lista del día
        </Typography>
        <Button onClick={load}>Actualizar</Button>
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
              <TableCell>Hora</TableCell>
              <TableCell>Cancha</TableCell>
              <TableCell>Código</TableCell>
              <TableCell>Cliente</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Ingreso</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  Sin reservas para hoy
                </TableCell>
              </TableRow>
            )}
            {rows.map((b) => (
              <TableRow key={b.id}>
                <TableCell>{fmtTime(b.start_time)}</TableCell>
                <TableCell>{b.court_name}</TableCell>
                <TableCell>
                  <b>{b.code}</b>
                </TableCell>
                <TableCell>
                  {b.customer_name}
                  {b.customer_phone && (
                    <Typography
                      variant="caption"
                      display="block"
                      color="text.secondary"
                    >
                      {b.customer_phone}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={b.status}
                    color={STATUS_COLOR[b.status] ?? "default"}
                  />
                </TableCell>
                <TableCell>
                  {b.checked_in_at ? "✔ " + b.checked_in_at.slice(11, 16) : "—"}
                </TableCell>
                <TableCell align="right">{fmtMoney(b.price_total)}</TableCell>
                <TableCell>
                  {!b.checked_in_at &&
                    ["procesando", "ocupada"].includes(b.status) && (
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => checkIn(b)}
                      >
                        Marcar ingreso
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
