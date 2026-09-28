import { Router } from 'express';
import { TransferController } from '../controllers/transfer.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/permission.middleware.js';

const router = Router();

router.get('/', authenticateToken, TransferController.getAll);
router.get('/pending-legs', authenticateToken, requireRole(['QC', 'CD']), TransferController.getPendingLegs);
router.post('/', authenticateToken, requireRole(['LC', 'CD']), TransferController.create);
router.post('/legs/:legId/approve', authenticateToken, requireRole(['QC', 'CD']), TransferController.approveLeg);
router.post('/legs/:legId/reject', authenticateToken, requireRole(['QC', 'CD']), TransferController.rejectLeg);
router.post('/:id/cancel', authenticateToken, TransferController.cancel);

export default router;