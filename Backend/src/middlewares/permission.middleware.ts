import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware.js';

export const requireRole = (allowedRoles: string[]) => {
  // Appel de la fonction de auth.middleware.ts
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    // Vérfification si il y'a bien un utilisateur
    if (!req.user) {
      res.status(401).json({ error: 'Unregistered' });
      return;
    }

    // Vérification du rôle de l'utilisateur
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({error: 'missing permisisons'});
      return;
    }

    next();
  };
};