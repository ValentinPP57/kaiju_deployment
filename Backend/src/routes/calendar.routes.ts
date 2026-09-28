import { Router } from 'express';
import { CalendarController } from '../controllers/calendar.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

// Événements
router.get('/', authenticateToken, CalendarController.getByRange);

// Créer un événement
router.post('/', authenticateToken, CalendarController.create);

router.delete('/:id', authenticateToken, CalendarController.delete);

export default router;