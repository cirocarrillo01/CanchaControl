// backend/src/controllers/expense.controller.js
import * as expenseService from '../services/expense.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const createExpense = asyncHandler(async (req, res) => {
    const expense = await expenseService.createExpense(req.body, req.user);
    res.status(201).json({ success: true, data: expense });
});

export const getExpenses = asyncHandler(async (req, res) => {
    const result = await expenseService.listExpenses(req.query);
    res.status(200).json({ success: true, ...result });
});
