import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Récupération JWT
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key';

// Définition de la requête
export interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    role: string;
    quarterId?: number | null;
  };
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  // Récupération token
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({error: 'No token'});
    return;
  }

  // Vérification et transmission
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; role: string; quarterId?: number | null};
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalide token'});
  }
}