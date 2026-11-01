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
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import API, { errMsg } from "../api/axios";
import { useNotify } from "../context/NotifyContext";

const mmss = (s) => {
  const sign = s < 0 ? "-" : "";
  s = Math.abs(s);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${sign}${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

export default function Timers() {
  const notify = useNotify();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadedAt, setLoadedAt] = useState(Date.now());
  const [, setTick] = useState(0); // fuerza re-render cada segundo

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await API.get("/bookings/timers");
      setRows(r.data.data ?? []);
      setLoadedAt(Date.now()); // ← referencia para el countdown
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const i = setInterval(load, 15_000);
    return () => clearInterval(i);
  }, [load]);

  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 1_000);
    return () => clearInterval(i);
  }, []);

  const finish = async (b) => {
    try {
      await API.post(`/bookings/${b.id}/finish`);
      notify("Finalizada", "success");
      load();
    } catch (e) {
      notify(errMsg(e), "error");
    }
  };
  const startTimer = async (b) => {
    try {
      await API.post(`/bookings/${b.id}/timer/start`, {});
      notify("Iniciado", "success");
      load();
    } catch (e) {
      notify(errMsg(e), "error");
    }
  };

  // Se recalcula en cada re-render (el setTick fuerza uno por segundo)
  const elapsed = Math.floor((Date.now() - loadedAt) / 1000);

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={2}>
        Cronómetros
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {loading && rows.length === 0 ? (
        <CircularProgress />
      ) : (
        <Stack direction="row" flexWrap="wrap" gap={2}>
          {rows.length === 0 && (
            <Typography color="text.secondary">
              No hay turnos activos.
            </Typography>
          )}
          {rows.map((b) => {
            const remaining = b.timer_ends_at
              ? b.remaining_seconds - elapsed
              : null;
            const overtime = b.timer_ends_at && remaining < 0;
            const totalSec =
              (b.duration_blocks ?? 1) * 60 + (b.extra_minutes ?? 0) * 60 ||
              3600;
            return (
              <Card
                key={b.id}
                sx={{
                  width: 280,
                  border: overtime ? "2px solid #d32f2f" : undefined,
                }}
              >
                <CardContent>
                  <Typography variant="h6" fontWeight={600}>
                    {b.court_name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {b.code} · {b.customer_name}
                  </Typography>
                  {b.timer_ends_at ? (
                    <>
                      <Typography
                        variant="h3"
                        align="center"
                        color={overtime ? "error" : "primary"}
                        sx={{ my: 1, fontFamily: "monospace" }}
                      >
                        {mmss(remaining)}
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        color={overtime ? "error" : "primary"}
                        value={Math.max(
                          0,
                          Math.min(100, (remaining / totalSec) * 100),
                        )}
                      />
                    </>
                  ) : (
                    <Typography
                      align="center"
                      color="text.secondary"
                      sx={{ my: 2 }}
                    >
                      Sin iniciar
                    </Typography>
                  )}
                  <Stack direction="row" spacing={1} mt={2}>
                    <Chip
                      size="small"
                      label={b.status}
                      color={b.status === "en_curso" ? "primary" : "default"}
                      sx={{ flexGrow: 1 }}
                    />
                    {b.status === "ocupada" && (
                      <Button size="small" onClick={() => startTimer(b)}>
                        Iniciar
                      </Button>
                    )}
                    {b.status === "en_curso" && (
                      <Button
                        size="small"
                        color="error"
                        onClick={() => finish(b)}
                      >
                        Finalizar
                      </Button>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
