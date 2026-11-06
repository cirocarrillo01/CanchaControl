// frontend/src/api/cash.js
import axios from './axios';

export const getCashStatus = (date) => axios.get('/cash/status', { params: { date } });
export const closeDay = (data) => axios.post('/cash/close', data);
