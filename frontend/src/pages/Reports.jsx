// frontend/src/pages/Reports.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  MenuItem,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
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

/** Devuelve el último día (YYYY-MM-DD) del mes al que pertenece `dateStr`. */
const endOfMonth = (dateStr) => {
  const [y, m] = dateStr.split("-").map(Number);
  const last = new Date(y, m, 0).getDate(); // m es 1-based → truco JS
  return `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
};

/** Resta n días a una fecha YYYY-MM-DD. */
const subDays = (dateStr, n) => {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
};

/** Rango por defecto según la agrupación. */
const rangeFor = (groupBy) => {
  const t = today();
  if (groupBy === "day") return { from: t, to: t };
  if (groupBy === "week") return { from: subDays(t, 6), to: t };
  if (groupBy === "month")
    return { from: `${t.slice(0, 7)}-01`, to: endOfMonth(t) };
  return { from: t, to: t };
};

const Kpi = ({ label, value, hint, accent }) => (
  <Card variant="outlined" sx={{ height: "100%" }}>
    <CardContent sx={{ py: 1.5, px: 2 }}>
      <Typography
        variant="caption"
        color="text.secondary"
        display="block"
        noWrap
      >
        {label}
      </Typography>
      <Typography
        variant="h6"
        fontWeight={700}
        color={accent || "text.primary"}
        noWrap
      >
        {value}
      </Typography>
      {hint && (
        <Typography variant="caption" color="text.secondary" noWrap>
          {hint}
        </Typography>
      )}
    </CardContent>
  </Card>
);

export default function Reports() {
  const [tab, setTab] = useState("income");
  const initial = rangeFor("day");
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [groupBy, setGroupBy] = useState("day");
  const [data, setData] = useState(null);
  const [methods, setMethods] = useState([]);
  const [finance, setFinance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setData(null);
    setMethods([]);
    setFinance(null);
    try {
      const params = { from, to };
      if (tab === "income") params.groupBy = groupBy;
      const main = API.get(`/reports/${tab}`, { params });

      // Extra: métodos y flujo de caja solo en Ingresos
      const extra =
        tab === "income"
          ? Promise.all([
              API.get(`/reports/methods`, { params }).catch(() => null),
              API.get(`/reports/finance`, { params }).catch(() => null),
            ])
          : Promise.resolve([null, null]);

      const [r, r2] = await Promise.all([main, extra]);
      setData(r.data?.data ?? null);
      if (r2?.[0]) setMethods(r2[0].data?.data?.methods ?? []);
      if (r2?.[1]) setFinance(r2[1].data?.data ?? null);
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

  const handleGroupChange = (g) => {
    setGroupBy(g);
    const r = rangeFor(g);
    setFrom(r.from);
    setTo(r.to);
  };

  const days = useMemo(() => data?.days ?? [], [data]);
  const courts = useMemo(() => data?.courts ?? [], [data]);
  const statuses = useMemo(() => data?.statuses ?? [], [data]);

  const kpis = useMemo(() => {
    if (!data) return [];

    if (tab === "income") {
      const bruto = Number(data.total_bruto ?? 0);
      const devol = Number(data.total_devoluciones ?? 0);
      const neto = Number(data.total_neto ?? data.total ?? 0);
      const totalBookings = Number(data.total_bookings ?? 0); // ← viene del backend
      const ticket = totalBookings > 0 ? neto / totalBookings : 0;
      return [
        {
          label: "Ingresos netos",
          value: fmtMoney(neto),
          accent: "success.main",
        },
        {
          label: "Ingresos brutos",
          value: fmtMoney(bruto),
          hint: `Devoluciones: ${fmtMoney(devol)}`,
          accent: "error.main",
        },
        { label: "Devoluciones", value: fmtMoney(devol) },
        {
          label: "Ticket promedio",
          value: fmtMoney(ticket),
          hint: `${totalBookings} reserva(s)`,
        },
      ];
    }

    if (tab === "usage") {
      const total = courts.reduce((s, c) => s + Number(c.total ?? 0), 0);
      const finalizadas = courts.reduce(
        (s, c) => s + Number(c.finalizada ?? 0),
        0,
      );
      const canceladas = courts.reduce(
        (s, c) => s + Number(c.cancelada ?? 0),
        0,
      );
      const tasa =
        total > 0 ? ((canceladas / total) * 100).toFixed(1) + "%" : "—";
      return [
        { label: "Canchas", value: courts.length },
        { label: "Reservas en el rango", value: total },
        { label: "Finalizadas", value: finalizadas, accent: "success.main" },
        {
          label: "Canceladas",
          value: canceladas,
          hint: `Tasa: ${tasa}`,
          accent: "error.main",
        },
      ];
    }

    if (tab === "status") {
      const total = statuses.reduce((s, x) => s + Number(x.count ?? 0), 0);
      const top = statuses[0];
      return [
        { label: "Estados distintos", value: statuses.length },
        { label: "Total reservas", value: total },
        {
          label: "Estado más común",
          value: top ? statusLabel(top.status) : "—",
        },
        { label: "Mayoría", value: top ? top.count : 0 },
      ];
    }
    return [];
  }, [data, days, courts, statuses, tab]);

  return (
    <Box sx={{ width: "100%", minWidth: 0 }}>
      <Typography variant="h5" fontWeight={700} mb={2}>
        Reportes
      </Typography>

      <Card sx={{ mb: 2 }}>
        <Tabs
          value={tab}
          onChange={(_e, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Ingresos" value="income" />
          <Tab label="Uso por cancha" value="usage" />
          <Tab label="Por estado" value="status" />
        </Tabs>
        <CardContent sx={{ pb: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={6} sm={3} md={2}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Desde"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6} sm={3} md={2}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Hasta"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            {tab === "income" && (
              <Grid item xs={12} sm={4} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  select
                  label="Agrupar por"
                  value={groupBy}
                  onChange={(e) => handleGroupChange(e.target.value)}
                >
                  <MenuItem value="day">Día (hoy)</MenuItem>
                  <MenuItem value="week">Semana (últimos 7 días)</MenuItem>
                  <MenuItem value="month">Mes (mes completo)</MenuItem>
                </TextField>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {loading && <CircularProgress />}

      {/* KPIs */}
      {!loading && data && (
        <Grid container spacing={2} mb={2}>
          {kpis.map((k, i) => (
            <Grid item xs={6} sm={6} md={3} key={i}>
              <Kpi {...k} />
            </Grid>
          ))}
        </Grid>
      )}

      {/* INGRESOS */}
      {!loading && data && tab === "income" && (
        <>
          {/* KPIs DE FLUJO DE CAJA (Fase 2) */}
          {finance && (
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>Flujo de caja del rango</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3} md={2}>
                    <Kpi label="Ingresos netos" value={fmtMoney(finance.total_income)} />
                  </Grid>
                  <Grid item xs={6} sm={3} md={2}>
                    <Kpi label="Egresos / Gastos" value={fmtMoney(finance.total_expense)} accent="error.main" />
                  </Grid>
                  <Grid item xs={6} sm={3} md={2}>
                    <Kpi label="Utilidad neta" accent="success.main" value={fmtMoney(finance.net_profit)} />
                  </Grid>
                  <Grid item xs={6} sm={3} md={2}>
                    <Kpi label="Margen" value={finance.margin.toFixed(1) + "%"} />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}

          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                {days.length} periodo(s) ·{" "}
                {groupBy === "day"
                  ? "agrupado por día"
                  : groupBy === "week"
                    ? "agrupado por semana"
                    : "agrupado por mes"}
              </Typography>
              <TableContainer sx={{ mt: 1 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Periodo</TableCell>
                      <TableCell align="right">Reservas</TableCell>
                      <TableCell align="right">Tiempo adic.</TableCell>
                      <TableCell align="right">Devoluciones</TableCell>
                      <TableCell align="right">Neto</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {days.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
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
                        <TableCell align="right" sx={{ color: "error.main" }}>
                          {Number(d.devoluciones ?? 0) > 0
                            ? `− ${fmtMoney(d.devoluciones)}`
                            : "—"}
                        </TableCell>
                        <TableCell align="right">
                          <b>{fmtMoney(d.total_neto ?? 0)}</b>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          {methods.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  Desglose por método de pago
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Método</TableCell>
                        <TableCell align="right">Bruto</TableCell>
                        <TableCell align="right">Devoluciones</TableCell>
                        <TableCell align="right">Neto</TableCell>
                        <TableCell align="right">Operaciones</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {methods.map((m) => (
                        <TableRow key={m.method}>
                          <TableCell sx={{ textTransform: "capitalize" }}>
                            {m.method}
                          </TableCell>
                          <TableCell align="right">
                            {fmtMoney(m.bruto ?? 0)}
                          </TableCell>
                          <TableCell align="right" sx={{ color: "error.main" }}>
                            {Number(m.devoluciones ?? 0) > 0
                              ? `− ${fmtMoney(m.devoluciones)}`
                              : "—"}
                          </TableCell>
                          <TableCell align="right">
                            <b>{fmtMoney(m.neto ?? 0)}</b>
                          </TableCell>
                          <TableCell align="right">{m.count ?? 0}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* USO POR CANCHA */}
      {!loading && data && tab === "usage" && (
        <Card>
          <CardContent>
            <Typography variant="caption" color="text.secondary">
              {courts.length} cancha(s) en el rango
            </Typography>
            <TableContainer sx={{ mt: 1 }}>
              <Table size="small">
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
            </TableContainer>
          </CardContent>
        </Card>
      )}
      {/* Alerta de devolucion */}
      {!loading &&
        data &&
        tab === "income" &&
        Number(data.total_devoluciones ?? 0) >
          Number(data.total_bruto ?? 0) && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Este rango incluye devoluciones de pagos recibidos{" "}
            <b>fuera del rango</b>. Se muestran en la fecha del pago original.
          </Alert>
        )}
      {/* POR ESTADO */}
      {!loading && data && tab === "status" && (
        <Card>
          <CardContent>
            <Typography variant="caption" color="text.secondary">
              {statuses.length} estado(s) con reservas en el rango
            </Typography>
            <TableContainer sx={{ mt: 1 }}>
              <Table size="small">
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
                      <TableCell align="right">
                        {Number(s.count ?? 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
