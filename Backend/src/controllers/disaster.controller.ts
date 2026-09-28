import { Request, Response } from 'express';
import { DisasterService } from '../services/disaster.service.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

export class DisasterController {
  // GET Disasters
  static async getCurrentState(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const state = await DisasterService.getCurrentState();
      res.status(200).json(state);
    } catch (error) {
      res.status(500).json({error: (error as Error).message});
    }
  }

  // POST Gérer le niveau de crise
  static async updateLevel(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { new_level } = req.body;

      if (!new_level || new_level < 1 || new_level > 5) {
        res.status(400).json({error: 'level must be between 1 and 5'});
        return;
      }

      if (!req.user?.userId) {
        res.status(401).json({error: 'User not registered'});
        return;
      }

      const updatedState = await DisasterService.updateLevel(Number(new_level), req.user.userId);
      res.status(200).json({message: 'disaster level updated at ' + new_level, state: updatedState});
    } catch (error) {
      res.status(500).json({error: (error as Error).message});
    }
  }

  // GET Historique des niveaux
  static async getHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const history = await DisasterService.getHistory();
      res.status(200).json(history);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  static async getAllQuarterStates(req: Request, res: Response): Promise<void> {
    try {
      const quarters = await DisasterService.getAllQuarterStates();
      res.status(200).json(quarters);
    } catch (error) {
      console.error("getAllQuarterStates", error);
 
      res.status(500).json({ error: (error as Error).message });
    }
  }

  // GET niveau par quartiers
  static async getQuarterState(req: Request, res: Response): Promise<void> {
    try {
      const quarterId = parseInt(req.params.id, 10);
      if (isNaN(quarterId)) {
        res.status(400).json({ error: "Invalid quarter Id" });
        return;
      }

      const quarter = await DisasterService.getQuarterState(quarterId);
      res.status(200).json(quarter);
    } catch (error) {
      res.status(404).json({ error: (error as Error).message });
    }
  }

  // POST modifier le niveau par quartier
  static async updateQuarterLevel(req: Request, res: Response): Promise<void> {
    try {
      const quarterId = parseInt(req.params.id, 10);
      const { newLevel } = req.body;

      if (isNaN(quarterId) || typeof newLevel !== 'number') {
        res.status(400).json({ error: "invalid data" });
        return;
      }

      const updatedQuarter = await DisasterService.updateQuarterLevel(quarterId, newLevel);
      res.status(200).json({
        message: "Disaster level upadted",
        quarter: updatedQuarter
      });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  static async updateRetentionRate(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { rate } = req.body;

    if (rate !== 0.3 && rate !== 0.15) {
      res.status(400).json({ error: 'rate must be  0.3 or 0.15' });
      return;
    }

    if (rate === 0.15) {
      const globalLevel = await DisasterService.getComputedGlobalLevel();
      if (globalLevel !== 5) {
        res.status(403).json({ error: 'global disaster level must be 5' });
        return;
      }
    }

    if (!req.user?.userId) {
      res.status(401).json({ error: 'user not registered' });
      return;
    }

    const updatedState = await DisasterService.updateRetentionRate(rate, req.user.userId);
    res.status(200).json({ message: 'Retention rate updated', state: updatedState });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
}
}