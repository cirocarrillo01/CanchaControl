// frontend/src/components/CashClosing.jsx
import { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, Paper, Divider } from '@mui/material';
import { getCashStatus, closeDay } from '../api/cash';
import { fmtMoney } from '../utils/format';

export default function CashClosing({ date, onClosed }) {
  const [status, setStatus] = useState(null);
  const [actualAmount, setActualAmount] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    fetchStatus();
  }, [date]);

  const fetchStatus = async () => {
    try {
      const res = await getCashStatus(date);
      setStatus(res.data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleClose = async () => {
    try {
      await closeDay({ actual_amount: actualAmount, note });
      onClosed();
      fetchStatus();
    } catch (e) {
      alert('Error al cerrar caja');
    }
  };

  if (!status) return <Typography>Cargando...</Typography>;
  if (status.status === 'cerrada') return <Typography color="success.main">Caja cerrada: {fmtMoney(status.close_amount)}</Typography>;

  return (
    <Paper sx={{ p: 3, mt: 2 }}>
      <Typography variant="h6">Cierre de Caja - {date}</Typography>
      <Box sx={{ my: 2 }}>
        <Typography>Ingresos esperados (sistema): {fmtMoney(status.expected_cash)}</Typography>
        <Typography>Egresos registrados: {fmtMoney(status.system_expense)}</Typography>
      </Box>
      <Divider sx={{ my: 1 }} />
      <TextField 
        fullWidth label="Dinero real contado" type="number" 
        value={actualAmount} onChange={(e) => setActualAmount(e.target.value)} 
        margin="normal" 
      />
      <TextField 
        fullWidth label="Nota / Justificación" multiline rows={2}
        value={note} onChange={(e) => setNote(e.target.value)} 
        margin="normal" 
      />
      <Button variant="contained" color="primary" onClick={handleClose} fullWidth sx={{ mt: 2 }}>
        Confirmar Cierre de Caja
      </Button>
    </Paper>
  );
}
