import { Router } from 'express';
import { DisasterController } from '../controllers/disaster.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/permission.middleware.js';

const router = Router();

// Niveau de crise actuel
router.get('/', authenticateToken, DisasterController.getCurrentState);

// Historique
router.get('/history', authenticateToken, DisasterController.getHistory);

// Niveau de tous les quartiers
router.get('/quarters', authenticateToken, DisasterController.getAllQuarterStates);

// Modifier le niveau
router.post('/level', authenticateToken, requireRole(['CD']), DisasterController.updateLevel);

// Niveau d'un quartier
router.get('/quarters/:id', authenticateToken, DisasterController.getQuarterState);

// Modifier le niveau d'un quartier
router.post('/quarters/:id/level', authenticateToken, requireRole(['CD']), DisasterController.updateQuarterLevel);

router.post('/retention-rate', authenticateToken, requireRole(['CD']), DisasterController.updateRetentionRate);

export default router;