// frontend/src/pages/Reports.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
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
import API, { errMsg } from "../api/axios";
import { fmtMoney, fmtPeriod, statusLabel } from "../utils/format";

const today = () => {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date());
};

export default function Reports() {
  const [tab, setTab] = useState("income");
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [groupBy, setGroupBy] = useState("day");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setData(null);
    try {
      const params = { from, to };
      if (tab === "income") params.groupBy = groupBy;
      const r = await API.get(`/reports/${tab}`, { params });
      setData(r.data?.data ?? null);
    } catch (e) {
      setError(errMsg(e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [tab, from, to, groupBy]);

  useEffect(() => {
    load();
  }, [load]);

  /* ---------------------------------------------------------------
   * Normalización defensiva: nunca dejamos que llegue `undefined`
   * al render. Si el backend no manda `days`, `courts` o `statuses`,
   * usamos un array vacío y mostramos "Sin datos".
   * --------------------------------------------------------------- */
  const days = useMemo(() => data?.days ?? [], [data]);
  const courts = useMemo(() => data?.courts ?? [], [data]);
  const statuses = useMemo(() => data?.statuses ?? [], [data]);

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={2}>
        Reportes
      </Typography>

      <Card sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_e, v) => setTab(v)}>
          <Tab label="Ingresos" value="income" />
          <Tab label="Uso por cancha" value="usage" />
          <Tab label="Por estado" value="status" />
        </Tabs>
        <CardContent>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            flexWrap="wrap"
          >
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
            {tab === "income" && (
              <TextField
                size="small"
                select
                label="Agrupar por"
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                sx={{ minWidth: 160 }}
              >
                <MenuItem value="day">Día</MenuItem>
                <MenuItem value="week">Semana</MenuItem>
                <MenuItem value="month">Mes</MenuItem>
              </TextField>
            )}
          </Stack>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {loading && <CircularProgress />}

      {/* ---------------------------- INGRESOS ---------------------------- */}
      {!loading && data && tab === "income" && (
        <Card>
          <CardContent>
            <Typography variant="h6">
              Total en el rango: {fmtMoney(data.total ?? 0)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Agrupado por{" "}
              {groupBy === "day"
                ? "día"
                : groupBy === "week"
                  ? "semana"
                  : "mes"}{" "}
              · {days.length} periodo(s)
            </Typography>

            <Table size="small" sx={{ mt: 1 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Periodo</TableCell>
                  <TableCell align="right">Reservas</TableCell>
                  <TableCell align="right">Tiempo adicional</TableCell>
                  <TableCell align="right">Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {days.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      Sin pagos en el rango
                    </TableCell>
                  </TableRow>
                )}
                {days.map((d, i) => (
                  <TableRow key={d.period ?? i}>
                    <TableCell>{fmtPeriod(d.period, groupBy)}</TableCell>
                    <TableCell align="right">
                      {fmtMoney(d.reservas ?? 0)}
                    </TableCell>
                    <TableCell align="right">
                      {fmtMoney(d.adicionales ?? 0)}
                    </TableCell>
                    <TableCell align="right">
                      <b>{fmtMoney(d.total ?? 0)}</b>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* -------------------------- USO POR CANCHA ------------------------ */}
      {!loading && data && tab === "usage" && (
        <Card>
          <CardContent>
            <Typography variant="caption" color="text.secondary">
              {courts.length} cancha(s) en el rango seleccionado
            </Typography>
            <Table size="small" sx={{ mt: 1 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Cancha</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell align="right">Procesando</TableCell>
                  <TableCell align="right">Ocupada</TableCell>
                  <TableCell align="right">Vigente</TableCell>
                  <TableCell align="right">Finalizada</TableCell>
                  <TableCell align="right">Cancelada</TableCell>
                  <TableCell align="right">Vencida</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {courts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      Sin canchas configuradas
                    </TableCell>
                  </TableRow>
                )}
                {courts.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.name}</TableCell>
                    <TableCell align="right">
                      <b>{Number(c.total ?? 0)}</b>
                    </TableCell>
                    <TableCell align="right">
                      {Number(c.procesando ?? 0)}
                    </TableCell>
                    <TableCell align="right">
                      {Number(c.ocupada ?? 0)}
                    </TableCell>
                    <TableCell align="right">
                      {Number(c.en_curso ?? 0)}
                    </TableCell>
                    <TableCell align="right">
                      {Number(c.finalizada ?? 0)}
                    </TableCell>
                    <TableCell align="right">
                      {Number(c.cancelada ?? 0)}
                    </TableCell>
                    <TableCell align="right">
                      {Number(c.vencida ?? 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ---------------------------- POR ESTADO -------------------------- */}
      {!loading && data && tab === "status" && (
        <Card>
          <CardContent>
            <Typography variant="caption" color="text.secondary">
              {statuses.length} estado(s) con reservas en el rango
            </Typography>
            <Table size="small" sx={{ mt: 1 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Cantidad</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {statuses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} align="center">
                      Sin datos
                    </TableCell>
                  </TableRow>
                )}
                {statuses.map((s) => (
                  <TableRow key={s.status}>
                    <TableCell>{statusLabel(s.status)}</TableCell>
                    <TableCell align="right">{Number(s.count ?? 0)}</TableCell>
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
