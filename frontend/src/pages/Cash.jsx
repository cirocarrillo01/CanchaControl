// frontend/src/pages/Cash.jsx
import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Stack,
  Alert,
  CircularProgress,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Divider,
  Grid,
  Chip,
} from "@mui/material";
import { useNotify } from "../context/NotifyContext";
import { useAuth } from "../context/AuthContext";
import API, { errMsg } from "../api/axios";
import { fmtMoney, fmtDate, fmtTime } from "../utils/format";

export default function Cash() {
  const notify = useNotify();
  const { user } = useAuth();
  const [drawer, setDrawer] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openAmt, setOpenAmt] = useState("");
  const [openNote, setOpenNote] = useState("");
  const [closeAmt, setCloseAmt] = useState("");
  const [closeNote, setCloseNote] = useState("");
  const [closeTime, setCloseTime] = useState(""); // Nueva variable para hora cierre manual
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [r, h] = await Promise.all([
        API.get("/cash/status"),
        API.get("/cash/history?limit=10"),
      ]);
      setDrawer(r.data.data || null);
      setHistory(h.data.data?.data || []);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleOpen = async () => {
    const amount = Number(openAmt);
    if (!amount || amount < 0) {
      notify("Monto inicial inválido", "error");
      return;
    }
    setBusy(true);
    try {
      await API.post("/cash/open", { 
        open_amount: amount, 
        note: openNote || null 
      });
      notify("Caja abierta correctamente", "success");
      setOpenAmt("");
      setOpenNote("");
      load();
    } catch (e) {
      notify(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };

  const handleClose = async () => {
    const amount = Number(closeAmt);
    if (!amount || amount < 0) {
      notify("Monto de cierre inválido", "error");
      return;
    }
    setBusy(true);
    try {
      await API.post("/cash/close", { 
        close_amount: amount, 
        note: closeNote || null,
        close_at: closeTime ? `${drawer.open_date} ${closeTime}:00` : null
      });
      notify("Caja cerrada y conciliada", "success");
      setCloseAmt("");
      setCloseNote("");
      setCloseTime("");
      load();
    } catch (e) {
      notify(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ width: "100%", minWidth: 0 }}>
      <Typography variant="h5" fontWeight={700}>
        Caja diaria / Arqueo
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {loading ? (
        <CircularProgress />
      ) : (
        <Stack spacing={3}>
          {drawer && drawer.status === "abierta" ? (
            <Card>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6" color="primary.main" fontWeight={700}>
                    Caja Abierta
                  </Typography>
                  <Chip label="En operación" color="success" />
                </Stack>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>INFORMACIÓN DE TURNO</Typography>
                    <Stack spacing={1} mt={1}>
                      <Typography variant="body2"><b>Fecha operativa:</b> {fmtDate(drawer.open_date)}</Typography>
                      <Typography variant="body2"><b>Abierta por:</b> {drawer.opened_by_name || "—"}</Typography>
                      <Typography variant="body2"><b>Hora apertura:</b> {drawer.open_at ? fmtTime(String(drawer.open_at).slice(11, 16)) : "—"}</Typography>
                    </Stack>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>RESUMEN FINANCIERO</Typography>
                    <Stack spacing={1} mt={1}>
                      <Typography variant="body2"><b>Saldo inicial (Apertura):</b> {fmtMoney(drawer.open_amount)}</Typography>
                    </Stack>
                  </Grid>
                </Grid>

                <Stack spacing={2} mt={4} pt={2} borderTop="1px solid #eee">
                  <Typography variant="subtitle2" color="text.secondary">
                    Realizar Cierre de Turno
                  </Typography>
                  <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Monto físico en caja (COP)"
                      value={closeAmt}
                      onChange={(e) => setCloseAmt(e.target.value)}
                      inputMode="numeric"
                      variant="outlined"
                      size="small"
                    />
                    <TextField
                      fullWidth
                      type="time"
                      label="Hora real de cierre (Opcional)"
                      value={closeTime}
                      onChange={(e) => setCloseTime(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      variant="outlined"
                      size="small"
                      helperText="Si se deja vacío, toma la hora actual"
                    />
                    <TextField
                      fullWidth
                      label="Nota de cierre (opcional)"
                      value={closeNote}
                      onChange={(e) => setCloseNote(e.target.value)}
                      variant="outlined"
                      size="small"
                    />
                    <Button
                      variant="contained"
                      color="error"
                      onClick={handleClose}
                      disabled={busy || user?.role !== "administrador"}
                      size="medium"
                      sx={{ whiteSpace: "nowrap" }}
                    >
                      {busy ? "Cerrando…" : user?.role === "administrador" ? "Cerrar caja y conciliar" : "Solo lectura"}
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ) : (
            <Card variant="outlined" sx={{ borderColor: "primary.main" }}>
              <CardContent>
                <Typography variant="h6" color="primary.main" gutterBottom>
                  {drawer && drawer.status === "cerrada" ? "Caja cerrada — Abrir nuevo turno" : "Abrir nuevo turno de caja"}
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  {drawer && drawer.status === "cerrada" 
                    ? `El turno anterior (${fmtDate(drawer.open_date)}) fue cerrado por ${drawer.closed_by_name || "—"} a las ${drawer.close_at ? fmtTime(String(drawer.close_at).slice(11, 16)) : "—"}.` 
                    : "No hay un turno activo. Registra el saldo inicial para comenzar."}
                </Typography>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2} mt={2}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Monto inicial (COP)"
                    value={openAmt}
                    onChange={(e) => setOpenAmt(e.target.value)}
                    inputMode="numeric"
                    variant="outlined"
                    size="small"
                  />
                  <TextField
                    fullWidth
                    label="Nota (opcional)"
                    value={openNote}
                    onChange={(e) => setOpenNote(e.target.value)}
                    variant="outlined"
                    size="small"
                  />
                  <Button
                    variant="contained"
                    onClick={handleOpen}
                    disabled={busy || user?.role !== "administrador"}
                    size="medium"
                    sx={{ 
                      whiteSpace: "nowrap",
                      height: "40px",
                      px: 4.5,
                      minWidth: "160px"
                    }}
                  >
                    {busy ? "Abriendo…" : user?.role === "administrador" ? "Abrir caja" : "Solo lectura"}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          )}

          <Divider />
          <Typography variant="h6">Historial reciente</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Fecha</TableCell>
                <TableCell>Abierta por</TableCell>
                <TableCell>Cerrada por</TableCell>
                <TableCell align="right">Apertura</TableCell>
                <TableCell align="right">Cierre</TableCell>
                <TableCell align="right">Diferencia</TableCell>
                <TableCell>Estado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{fmtDate(row.open_date)}</TableCell>
                  <TableCell>{row.opened_by_name || "—"}</TableCell>
                  <TableCell>{row.closed_by_name || "—"}</TableCell>
                  <TableCell align="right">{fmtMoney(row.open_amount)}</TableCell>
                  <TableCell align="right">{row.close_amount !== null && row.close_amount !== undefined ? fmtMoney(row.close_amount) : "—"}</TableCell>
                  <TableCell align="right" sx={{ color: Number(row.difference ?? 0) < 0 ? "error.main" : "success.main" }}>
                    {row.close_amount !== null && row.close_amount !== undefined ? fmtMoney(row.difference) : "—"}
                  </TableCell>
                  <TableCell sx={{ textTransform: "capitalize" }}>{row.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Stack>
      )}
    </Box>
  );
}
