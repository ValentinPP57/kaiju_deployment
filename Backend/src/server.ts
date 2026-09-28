import dotenv from 'dotenv';
import app from './app.js';
import { createServer } from 'http';
import { Server } from 'socket.io';
import disasterRoutes from './routes/disaster.routes.js';

dotenv.config();

const httpServer = createServer(app);

export const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173/",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log(`connecté : ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`déconnecté : ${socket.id}`);
  });
});

// Routes API Express
app.use('/api/disasters', disasterRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Serveur lancé sur : http://localhost:${PORT}`);
});