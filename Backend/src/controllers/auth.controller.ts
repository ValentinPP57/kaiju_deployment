import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, role, quarter_id } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: 'missing credentials' });
        return;
      }

      const user = await AuthService.register({ email, password, role, quarter_id });
      res.status(201).json({ message: 'User created', user });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: 'missing credentials' });
        return;
      }

      const { user, token } = await AuthService.login(email, password);
      res.status(200).json({ message: 'Connexion réussie', token, user });
    } catch (error) {
      res.status(401).json({ error: (error as Error).message });
    }
  }
}