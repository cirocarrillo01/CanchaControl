// frontend/src/pages/Expenses.jsx
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
  MenuItem,
} from "@mui/material";
import { useNotify } from "../context/NotifyContext";
import API, { errMsg } from "../api/axios";
import { fmtMoney, fmtDate } from "../utils/format";

const CATEGORIES = ["servicios", "mantenimiento", "nomina", "insumos", "varios", "servicios_publicos", "limpieza", "marketing", "productos", "otros"];

import { useAuth } from "../context/AuthContext";

export default function Expenses() {
  const { user } = useAuth();
  const notify = useNotify();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("varios");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await API.get("/expenses");
      setRows(r.data.data || []);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      notify("Monto inválido", "error");
      return;
    }
    setBusy(true);
    try {
      await API.post("/expenses", {
        amount: amt,
        category,
        description: description || null,
      });
      notify("Gasto registrado", "success");
      setAmount("");
      setDescription("");
      load();
    } catch (e) {
      notify(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ width: "100%", minWidth: 0 }}>
      <Typography variant="h5" fontWeight={700} mb={2}>
        Gastos / Egresos
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" mb={2}>Registrar Nuevo Gasto</Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              type="number"
              label="Monto (COP)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              size="small"
              fullWidth
            />
            <TextField
              select
              label="Categoría"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              size="small"
              fullWidth
            >
              {CATEGORIES.map((cat) => (
                <MenuItem key={cat} value={cat} sx={{ textTransform: "capitalize" }}>
                  {cat.replace('_', ' ')}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Descripción"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              size="small"
              fullWidth
            />
            <Button
              variant="contained"
              onClick={handleCreate}
              disabled={busy || user?.role !== "administrador"}
              sx={{ 
                whiteSpace: "nowrap",
                height: "40px",
                px: 4.5,
                minWidth: "160px"
              }}
            >
              {busy ? "Guardando…" : user?.role === "administrador" ? "Guardar Gasto" : "Solo lectura"}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {loading ? (
        <CircularProgress />
      ) : (
        <Card>
          <CardContent>
            <Typography variant="h6" mb={1}>Historial de Gastos</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Registrado por</TableCell>
                  <TableCell>Categoría</TableCell>
                  <TableCell>Descripción</TableCell>
                  <TableCell align="right">Monto</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      No hay gastos registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{fmtDate(row.paid_at || row.expense_date)}</TableCell>
                      <TableCell>{row.created_by_name || "—"}</TableCell>
                      <TableCell sx={{ textTransform: "capitalize" }}>{row.category.replace('_', ' ')}</TableCell>
                      <TableCell>{row.note || row.description || "—"}</TableCell>
                      <TableCell align="right">
                        <b>{fmtMoney(row.amount)}</b>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
