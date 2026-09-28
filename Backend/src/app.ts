import express, { Request, Response } from 'express';
import { query } from './config/database.js';
import authRoutes from './routes/auth.routes.js';
import disasterRoutes from './routes/disaster.routes.js';
import transferRoutes from './routes/transfer.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';
import cors from 'cors';
import calendarRoutes from './routes/calendar.routes.js';

const app = express();

app.use(express.json());

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));

// Route Check
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    const dbResult = await query('SELECT NOW()');
    res.status(200).json({
      status: 'ok',
      message: 'Working',
      timestamp: dbResult.rows[0].now,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Db error',
      error: (error as Error).message,
    });
  }
});

// routes
app.use('/api/auth', authRoutes);
app.use('/api/disasters', disasterRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/inventories', inventoryRoutes);
app.use('/api/calendar', calendarRoutes);

export default app;