// frontend/src/pages/Reports.jsx
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
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
import API, { errMsg } from "../api/axios";
import { fmtDate, fmtMoney } from "../utils/format";

const today = () => new Date().toISOString().slice(0, 10);

export default function Reports() {
  const [tab, setTab] = useState("income");
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setData(null); // reiniciar al cambiar de pestaña para evitar datos huérfanos
    try {
      const r = await API.get(`/reports/${tab}`, { params: { from, to } });
      setData(r.data.data);
    } catch (e) {
      setError(errMsg(e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [tab, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={2}>
        Reportes
      </Typography>
      <Card sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Ingresos" value="income" />
          <Tab label="Uso por cancha" value="usage" />
          <Tab label="Por estado" value="status" />
        </Tabs>
        <CardContent>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              size="small"
              type="date"
              label="Desde"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              size="small"
              type="date"
              label="Hasta"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {loading && <CircularProgress />}

      {data && tab === "income" && (
        <Card>
          <CardContent>
            <Typography variant="h6">
              Total en el rango: {fmtMoney(data.total)}
            </Typography>
            <Table size="small" sx={{ mt: 1 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Día</TableCell>
                  <TableCell align="right">Reservas</TableCell>
                  <TableCell align="right">Tiempo adicional</TableCell>
                  <TableCell align="right">Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.days?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      Sin pagos
                    </TableCell>
                  </TableRow>
                )}
                {data?.days?.map((d) => (
                  <TableRow key={d.day}>
                    <TableCell>{fmtDate(d.day)}</TableCell>
                    <TableCell align="right">{fmtMoney(d.reservas)}</TableCell>
                    <TableCell align="right">
                      {fmtMoney(d.adicionales)}
                    </TableCell>
                    <TableCell align="right">
                      <b>{fmtMoney(d.total)}</b>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {data && tab === "usage" && (
        <Card>
          <CardContent>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Cancha</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell align="right">Completadas</TableCell>
                  <TableCell align="right">Canceladas</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.courts?.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.name}</TableCell>
                    <TableCell align="right">{c.total}</TableCell>
                    <TableCell align="right">{c.completadas ?? 0}</TableCell>
                    <TableCell align="right">{c.canceladas ?? 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {data && tab === "status" && (
        <Card>
          <CardContent>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Cantidad</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.statuses?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} align="center">
                      Sin datos
                    </TableCell>
                  </TableRow>
                )}
                {data?.statuses?.map((s) => (
                  <TableRow key={s.status}>
                    <TableCell>{s.status}</TableCell>
                    <TableCell align="right">{s.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
