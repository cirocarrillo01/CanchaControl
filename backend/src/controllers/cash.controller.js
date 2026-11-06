// backend/src/controllers/cash.controller.js
import * as cashService from '../services/cash.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const openDay = asyncHandler(async (req, res) => {
    const opened = await cashService.openCash(req.body, req.user);
    res.status(201).json({ success: true, data: opened });
});

export const closeDay = asyncHandler(async (req, res) => {
    // Ajustado para coincidir con cashService.closeCash
    const closing = await cashService.closeCash(req.body, req.user);
    res.status(201).json({ success: true, data: closing });
});

export const getStatus = asyncHandler(async (req, res) => {
    // Ajustado para coincidir con cashService.getOpenCash
    const status = await cashService.getOpenCash(req.query.date);
    res.status(200).json({ success: true, data: status });
});

export const getHistory = asyncHandler(async (req, res) => {
    const history = await cashService.getCashHistory(req.query);
    res.status(200).json({ success: true, data: history });
});
