// frontend/src/pages/Bookings.jsx
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
  Menu,
  MenuItem,
  Pagination,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { Tune } from "@mui/icons-material";
import API, { errMsg } from "../api/axios";
import { useNotify } from "../context/NotifyContext";
import { fmtDate, fmtMoney, fmtTime, statusLabel } from "../utils/format";

const today = () => {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date());
};

const STATUS_COLOR = {
  procesando: "warning",
  ocupada: "error",
  en_curso: "primary",
  finalizada: "success",
  cancelada: "default",
  vencida: "default",
};
const PAY_COLOR = {
  pendiente: "default",
  parcial: "warning",
  pagado: "success",
};

// Sentinel explícito "all" — nunca choca con un estado real
const FILTER_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "procesando", label: "Procesando" },
  { value: "ocupada", label: "Ocupada" },
  { value: "en_curso", label: "Vigente" },
  { value: "finalizada", label: "Finalizada" },
  { value: "cancelada", label: "Cancelada" },
  { value: "vencida", label: "Vencida" },
];

export default function Bookings() {
  const notify = useNotify();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("procesando");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [menu, setMenu] = useState({ anchor: null, booking: null });

  const [payOpen, setPayOpen] = useState(false);
  const [payBooking, setPayBooking] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("efectivo");
  const [payBusy, setPayBusy] = useState(false);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelBooking, setCancelBooking] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelBusy, setCancelBusy] = useState(false);

  const [reschedOpen, setReschedOpen] = useState(false);
  const [reschedBooking, setReschedBooking] = useState(null);
  const [reschedDate, setReschedDate] = useState("");
  const [reschedStart, setReschedStart] = useState("");
  const [reschedBusy, setReschedBusy] = useState(false);

  const [refundOpen, setRefundOpen] = useState(false);
  const [refundBooking, setRefundBooking] = useState(null);
  const [refundReason, setRefundReason] = useState("");
  const [refundMethod, setRefundMethod] = useState("efectivo");
  const [refundBusy, setRefundBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page, limit: 20 };
      if (status && status !== "all") params.status = status;
      if (q) params.q = q;
      const r = await API.get("/bookings", { params });
      setRows(r.data.data ?? []);
      setTotal(r.data.total ?? 0);
      setTotalPages(r.data.totalPages ?? 1);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [status, q, page]);

  useEffect(() => {
    load();
  }, [load]);

  const action = async (fn, ok) => {
    try {
      await fn();
      notify(ok, "success");
      load();
    } catch (e) {
      notify(errMsg(e), "error");
    } finally {
      setMenu({ anchor: null, booking: null });
    }
  };

  // --------- Pago ---------
  const openPayment = (booking) => {
    setMenu({ anchor: null, booking: null });
    setPayBooking(booking);
    const saldo =
      (booking.price_total ?? 0) -
      ((booking.paid_reservation ?? 0) + (booking.paid_extra ?? 0));
    setPayAmount(String(saldo > 0 ? saldo : (booking.price_total ?? "")));
    setPayMethod("efectivo");
    setPayOpen(true);
  };

  const submitPayment = async () => {
    const amount = Number(payAmount);
    if (!amount || amount <= 0) {
      notify("Ingresa un monto válido", "error");
      return;
    }
    setPayBusy(true);
    try {
      await API.post(`/bookings/${payBooking.id}/payments`, {
        amount,
        method: payMethod,
        kind: "reserva",
      });
      notify("Pago registrado", "success");
      setPayOpen(false);
      setPayBooking(null);
      setPayAmount("");
      load();
    } catch (e) {
      notify(errMsg(e), "error");
    } finally {
      setPayBusy(false);
    }
  };

  // --------- Cancelar ---------
  const openCancel = (booking) => {
    setMenu({ anchor: null, booking: null });
    setCancelBooking(booking);
    setCancelReason("Cancelada por el administrador");
    setCancelOpen(true);
  };

  const submitCancel = async () => {
    setCancelBusy(true);
    try {
      await API.post(`/bookings/${cancelBooking.id}/cancel`, {
        reason: cancelReason || "Cancelada por el administrador",
      });
      notify("Reserva cancelada", "success");
      setCancelOpen(false);
      setCancelBooking(null);
      setCancelReason("");
      load();
    } catch (e) {
      notify(errMsg(e), "error");
    } finally {
      setCancelBusy(false);
    }
  };

  const openRefund = (booking) => {
    setMenu({ anchor: null, booking: null });
    setRefundBooking(booking);
    setRefundReason("Cliente no requiere el servicio");
    setRefundMethod("efectivo");
    setRefundOpen(true);
  };

  const submitRefund = async () => {
    setRefundBusy(true);
    try {
      await API.post(`/bookings/${refundBooking.id}/refund`, {
        reason: refundReason || "Devolución solicitada",
        method: refundMethod,
      });
      notify("Devolución registrada", "success");
      setRefundOpen(false);
      setRefundBooking(null);
      load();
    } catch (e) {
      notify(errMsg(e), "error");
    } finally {
      setRefundBusy(false);
    }
  };

  // --------- Reprogramar ---------
  const openReschedule = (booking) => {
    setMenu({ anchor: null, booking: null });
    setReschedBooking(booking);
    setReschedDate(booking.date);
    setReschedStart(booking.start_time.slice(0, 5));
    setReschedOpen(true);
  };

  const submitReschedule = async () => {
    if (!reschedDate || !reschedStart) {
      notify("Fecha y hora son obligatorias", "error");
      return;
    }
    if (reschedDate < today()) {
      notify("No puedes reprogramar a una fecha pasada", "error");
      return;
    }
    if (reschedDate === today()) {
      const nowHHMM = new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "America/Bogota",
      }).format(new Date());
      if (reschedStart <= nowHHMM) {
        notify("No puedes reprogramar a una hora ya pasada", "error");
        return;
      }
    }
    setReschedBusy(true);
    try {
      await API.post(`/bookings/${reschedBooking.id}/reschedule`, {
        date: reschedDate,
        start_time:
          reschedStart.length === 5 ? `${reschedStart}:00` : reschedStart,
      });
      notify("Reserva reprogramada", "success");
      setReschedOpen(false);
      setReschedBooking(null);
      load();
    } catch (e) {
      notify(errMsg(e), "error");
    } finally {
      setReschedBusy(false);
    }
  };

  return (
    <Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ sm: "center" }}
        spacing={2}
        mb={2}
      >
        <Typography variant="h5" fontWeight={700} sx={{ flexGrow: 1 }}>
          Reservas
        </Typography>
        <TextField
          size="small"
          select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          label="Estado"
          sx={{ minWidth: 180 }}
        >
          {FILTER_OPTIONS.map((o) => (
            <MenuItem key={o.value} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          placeholder="Buscar código/nombre/teléfono"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          sx={{ minWidth: 260 }}
        />
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
              <TableCell>Código</TableCell>
              <TableCell>Cancha</TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell>Hora</TableCell>
              <TableCell>Cliente</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Pago</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  Sin resultados
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
                    label={statusLabel(b.status)}
                    color={STATUS_COLOR[b.status] ?? "default"}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={b.payment_status}
                    color={PAY_COLOR[b.payment_status] ?? "default"}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell align="right">{fmtMoney(b.price_total)}</TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={(e) =>
                      setMenu({ anchor: e.currentTarget, booking: b })
                    }
                  >
                    <Tune fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Menu
        anchorEl={menu.anchor}
        open={Boolean(menu.anchor)}
        onClose={() => setMenu({ anchor: null, booking: null })}
      >
        {menu.booking && (
          <>
            {menu.booking.status === "procesando" &&
              menu.booking.payment_status !== "pagado" && (
                <MenuItem onClick={() => openPayment(menu.booking)}>
                  Registrar pago
                </MenuItem>
              )}
            {menu.booking.status === "procesando" &&
              menu.booking.payment_status === "pagado" && (
                <MenuItem
                  onClick={() =>
                    action(
                      () => API.post(`/bookings/${menu.booking.id}/confirm`),
                      "Reserva aprobada",
                    )
                  }
                >
                  Aprobar reserva
                </MenuItem>
              )}
            {menu.booking.status === "ocupada" &&
              menu.booking.payment_status !== "pagado" && (
                <MenuItem onClick={() => openPayment(menu.booking)}>
                  Registrar pago
                </MenuItem>
              )}
            {["procesando", "ocupada"].includes(menu.booking.status) && (
              <MenuItem onClick={() => openReschedule(menu.booking)}>
                Reprogramar
              </MenuItem>
            )}
            {["procesando", "ocupada"].includes(menu.booking.status) &&
              ["pagado", "parcial"].includes(menu.booking.payment_status) && (
                <MenuItem onClick={() => openRefund(menu.booking)}>
                  Devolver pago
                </MenuItem>
              )}
            {["procesando", "ocupada"].includes(menu.booking.status) && (
              <MenuItem onClick={() => openCancel(menu.booking)}>
                Cancelar
              </MenuItem>
            )}

            {menu.booking.status === "ocupada" &&
              !menu.booking.timer_started_at && (
                <MenuItem
                  onClick={() =>
                    action(
                      () =>
                        API.post(
                          `/bookings/${menu.booking.id}/timer/start`,
                          {},
                        ),
                      "Cronómetro iniciado",
                    )
                  }
                >
                  Iniciar cronómetro
                </MenuItem>
              )}
            {menu.booking.status === "en_curso" && (
              <MenuItem
                onClick={() =>
                  action(
                    () => API.post(`/bookings/${menu.booking.id}/finish`),
                    "Turno finalizado",
                  )
                }
              >
                Finalizar turno
              </MenuItem>
            )}
          </>
        )}
      </Menu>
      {/* Modal pago */}
      <Dialog
        open={payOpen}
        onClose={() => (payBusy ? null : setPayOpen(false))}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Registrar pago</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <Typography variant="body2">
              Reserva <b>{payBooking?.code}</b> · {payBooking?.court_name}
            </Typography>
            <Typography variant="body2">
              Total: <b>{fmtMoney(payBooking?.price_total)}</b> · Pagado:{" "}
              <b>
                {fmtMoney(
                  (payBooking?.paid_reservation ?? 0) +
                    (payBooking?.paid_extra ?? 0),
                )}
              </b>
            </Typography>
            <TextField
              label="Monto a cobrar"
              type="number"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              fullWidth
              autoFocus
            />
            <TextField
              select
              label="Método de pago"
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value)}
              fullWidth
            >
              <MenuItem value="efectivo">Efectivo</MenuItem>
              <MenuItem value="transferencia">Transferencia</MenuItem>
              <MenuItem value="tarjeta">Tarjeta</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPayOpen(false)} disabled={payBusy}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={submitPayment}
            disabled={payBusy}
          >
            {payBusy ? "Registrando…" : "Registrar pago"}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Modal cancelar */}
      <Dialog
        open={cancelOpen}
        onClose={() => (cancelBusy ? null : setCancelOpen(false))}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Cancelar reserva</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <Typography variant="body2">
              Reserva <b>{cancelBooking?.code}</b> · {cancelBooking?.court_name}
            </Typography>
            <Typography variant="body2">
              Fecha: <b>{cancelBooking ? fmtDate(cancelBooking.date) : ""}</b> ·
              Hora:{" "}
              <b>{cancelBooking ? fmtTime(cancelBooking.start_time) : ""}</b>
            </Typography>
            <TextField
              label="Motivo de la cancelación"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              fullWidth
              multiline
              minRows={2}
              autoFocus
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelOpen(false)} disabled={cancelBusy}>
            Volver
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={submitCancel}
            disabled={cancelBusy}
          >
            {cancelBusy ? "Cancelando…" : "Confirmar cancelación"}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Modal reprogramar */}
      <Dialog
        open={reschedOpen}
        onClose={() => (reschedBusy ? null : setReschedOpen(false))}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Reprogramar reserva</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <Typography variant="body2">
              Reserva <b>{reschedBooking?.code}</b> ·{" "}
              {reschedBooking?.court_name}
            </Typography>
            <Typography variant="body2">
              Actual:{" "}
              <b>
                {reschedBooking ? fmtDate(reschedBooking.date) : ""} ·{" "}
                {reschedBooking ? fmtTime(reschedBooking.start_time) : ""}
              </b>
            </Typography>
            <TextField
              label="Nueva fecha"
              type="date"
              value={reschedDate}
              onChange={(e) => setReschedDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: today() }}
              fullWidth
            />
            <TextField
              label="Nueva hora de inicio"
              type="time"
              value={reschedStart}
              onChange={(e) => setReschedStart(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <Typography variant="caption" color="text.secondary">
              El precio, la duración y los pagos se conservan.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReschedOpen(false)} disabled={reschedBusy}>
            Volver
          </Button>
          <Button
            variant="contained"
            onClick={submitReschedule}
            disabled={reschedBusy}
          >
            {reschedBusy ? "Reprogramando…" : "Reprogramar"}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Modal devolución */}
      <Dialog
        open={refundOpen}
        onClose={() => (refundBusy ? null : setRefundOpen(false))}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Devolver pago</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <Typography variant="body2">
              Reserva <b>{refundBooking?.code}</b> · {refundBooking?.court_name}
            </Typography>
            <Typography variant="body2">
              Pagado total:{" "}
              <b>
                {fmtMoney(
                  (refundBooking?.paid_reservation ?? 0) +
                    (refundBooking?.paid_extra ?? 0),
                )}
              </b>
            </Typography>
            <Typography variant="body2" color="error.main">
              Máximo reembolsable: pagos menos devoluciones previas de esta
              reserva.
            </Typography>
            <TextField
              label="Motivo del reembolso"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              fullWidth
              multiline
              minRows={2}
            />
            <TextField
              select
              label="Método del reembolso"
              value={refundMethod}
              onChange={(e) => setRefundMethod(e.target.value)}
              fullWidth
            >
              <MenuItem value="efectivo">Efectivo</MenuItem>
              <MenuItem value="transferencia">Transferencia</MenuItem>
              <MenuItem value="tarjeta">Tarjeta</MenuItem>
            </TextField>
            <Typography variant="caption" color="text.secondary">
              La reserva pasará a estado reembolsada/cancelada y el bloque
              quedará libre. El monto se descontará de los ingresos del día.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRefundOpen(false)} disabled={refundBusy}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={submitRefund}
            disabled={refundBusy}
          >
            {refundBusy ? "Devolviendo…" : "Confirmar devolución"}
          </Button>
        </DialogActions>
      </Dialog>
      {total > 0 && (
        <Box sx={{ mt: 3, display: "flex", justifyContent: "center" }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_e, v) => setPage(v)}
            showFirstButton
            showLastButton
          />
        </Box>
      )}
    </Box>
  );
}
