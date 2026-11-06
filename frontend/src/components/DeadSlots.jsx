// frontend/src/components/DeadSlots.jsx
import { useEffect, useState } from 'react';
import { Paper, Typography, List, ListItem, ListItemText } from '@mui/material';
import axios from '../api/axios';

export default function DeadSlots() {
  const [slots, setSlots] = useState([]);

  useEffect(() => {
    const fetchDead = async () => {
      const month = new Date().getMonth() + 1;
      const year = new Date().getFullYear();
      const res = await axios.get(`/reports/dead-slots?month=${month}&year=${year}`);
      setSlots(res.data.data);
    };
    fetchDead();
  }, []);

  return (
    <Paper sx={{ p: 3, mt: 2 }}>
      <Typography variant="h6">Top Horarios Menos Rentables</Typography>
      <List>
        {slots.map((s, i) => (
          <ListItem key={i}>
            <ListItemText 
              primary={`Día ${s.day} - ${s.slot_start}`} 
              secondary={`Frecuencia de inactividad: ${s.frequency} veces`} 
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}
