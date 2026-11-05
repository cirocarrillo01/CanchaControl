// frontend/src/pages/Cash.jsx
// === Fase 2 DESHABILITADA A PROPOSITO ===
// Página de Caja / Arqueo. Inhabilitada intencionalmente.
// El código completo fue eliminado de la aplicación para evitar
// que aparezca en el sistema ni en el sidebar.
// Para reactivar, se puede restaurar el componente desde el repositorio.
// ===============================================

  const notify = useNotify();
  const [drawer, setDrawer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openAmt, setOpenAmt] = useState("");
  const [openNote, setOpenNote] = useState("");
  const [closeAmt, setCloseAmt] = useState("");
  const [closeNote, setCloseNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const r = await API.get("/cash/open");
      setDrawer(r.data.data || null);
    } catch (e) { setError(errMsg(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleOpen = async () => {
    const amount = Number(openAmt);
    if (!amount || amount < 0) { notify("Monto inicial inválido", "error"); return; }
    setBusy(true);
    try {
      await API.post("/cash/open", { open_amount: amount, note: openNote || null });
      notify("Caja abierta", "success");
      setOpenAmt(""); setOpenNote("");
      load();
    } catch (e) { notify(errMsg(e), "error"); }
    finally { setBusy(false); }
  };

  const handleClose = async () => {
    const amount = Number(closeAmt);
    if (!amount || amount < 0) { notify("Monto de cierre inválido", "error"); return; }
    setBusy(true);
    try {
      await API.post("/cash/close", { close_amount: amount, note: closeNote || null });
      notify("Caja cerrada y conciliada", "success");
      setCloseAmt(""); setCloseNote("");
      load();
    } catch (e) { notify(errMsg(e), "error"); }
    finally { setBusy(false); }
  };

  return (
    <Box sx={{ width: "100%", minWidth: 0 }}>
      <Typography variant="h5" fontWeight={700}>Caja diaria / Arqueo</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {loading ? (
        <CircularProgress />
      ) : drawer ? (
        <>
          <Card>
            <CardContent>
              <Typography variant="body2">Fecha: {fmtDate(drawer.open_date)}</Typography>
              <Typography variant="body2">Estado: {drawer.status === "abierta" ? "Abierta" : "Cerrada"}</Typography>
              {drawer.status === "abierta" ? (
                <>
                  <Typography variant="h6" color="success.main">Monto de apertura: {fmtMoney(drawer.open_amount)}</Typography>
                  <Typography variant="caption" color="text.secondary">Abierta por {drawer.opened_by_name || "—"} a las {fmtTime(String(drawer.open_at).slice(11, 16))}</Typography>
                  <Stack direction="row" spacing={2} mt={2}>
                    <TextField fullWidth type="number" label="Monto físico en caja (COP)" value={closeAmt} onChange={(e) => setCloseAmt(e.target.value)} inputMode="numeric" />
                    <TextField fullWidth label="Nota de cierre (opcional)" value={closeNote} onChange={(e) => setCloseNote(e.target.value)} />
                    <Button variant="contained" color="error" onClick={handleClose} disabled={busy}>
                      {busy ? "Cerrando…" : "Cerrar caja y conciliar"}
                    </Button>
                  </Stack>
                </>
              ) : (
                <>
                  <Typography variant="h6">Monto de apertura: {fmtMoney(drawer.open_amount)}</Typography>
                  <Typography variant="h6" color="error.main">Monto físico contado: {fmtMoney(drawer.close_amount)}</Typography>
                  <Typography variant="h6" color="success.main">Ingresos del sistema: {fmtMoney(drawer.system_income)}</Typography>
                  <Typography variant="h6" color="error.main">Egresos del sistema: {fmtMoney(drawer.system_expense)}</Typography>
                  <Typography variant="h6">Esperado en caja: {fmtMoney(drawer.expected_cash)}</Typography>
                  <Typography color={drawer.difference >= 0 ? "success.main" : "error.main"}>
                    Diferencia: {fmtMoney(drawer.difference)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">Cerrada por {drawer.closed_by_name || "—"} a las {drawer.close_at ? fmtTime(String(drawer.close_at).slice(11, 16)) : "—"}</Typography>
                </>
              )}
            </CardContent>
          </Card>
          {drawer.status === "abierta" && (
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>Abrir caja hoy</Typography>
                <Stack direction="row" spacing={2}>
                  <TextField fullWidth type="number" label="Monto inicial (COP)" value={openAmt} onChange={(e) => setOpenAmt(e.target.value)} inputMode="numeric" />
                  <TextField fullWidth label="Nota (opcional)" value={openNote} onChange={(e) => setOpenNote(e.target.value)} />
                  <Button variant="contained" onClick={handleOpen} disabled={busy}>
                    {busy ? "Abriendo…" : "Abrir caja"}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent>
            <Typography variant="body2">No hay registro de caja para hoy.</Typography>
            <Stack direction="row" spacing={2} mt={2}>
              <TextField fullWidth type="number" label="Monto inicial (COP)" value={openAmt} onChange={(e) => setOpenAmt(e.target.value)} inputMode="numeric" />
              <TextField fullWidth label="Nota (opcional)" value={openNote} onChange={(e) => setOpenNote(e.target.value)} />
              <Button variant="contained" onClick={handleOpen} disabled={busy}>
                {busy ? "Abriendo…" : "Abrir caja"}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}