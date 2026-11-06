import express from 'express';
const router = express.Router();
import * as expenseController from '../controllers/expense.controller.js';
import { protect, authorize } from '../middlewares/auth.middleware.js';

router.use(protect);
router.use(authorize('administrador', 'auditor'));

router.route('/')
    .post(expenseController.createExpense)
    .get(expenseController.getExpenses);

export default router;

