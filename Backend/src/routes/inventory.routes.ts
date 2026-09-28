import { Router } from 'express';
import { InventoryController } from '../controllers/inventory.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

//inventaire d'un quartier
router.get('/quarter/:quarterId', authenticateToken, InventoryController.getByQuarter);

export default router;