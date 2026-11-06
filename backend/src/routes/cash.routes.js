// backend/src/routes/cash.routes.js
import express from 'express';
const router = express.Router();
import * as cashController from '../controllers/cash.controller.js';
import { protect, authorize } from '../middlewares/auth.middleware.js';

router.use(protect);
router.use(authorize('administrador', 'auditor'));

router.post('/open', cashController.openDay);
router.post('/close', cashController.closeDay);
router.get('/status', cashController.getStatus);
router.get('/history', cashController.getHistory);

export default router;

