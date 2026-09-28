import { Response } from 'express';
import { InventoryService } from '../services/inventory.service.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

export class InventoryController {
  // GET Inventaire par quartiers
  static async getByQuarter(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { quarterId } = req.params;
      const inventory = await InventoryService.getByQuarter(Number(quarterId));
      res.status(200).json(inventory);
    } catch (error) {
      res.status(500).json({error: (error as Error).message});
    }
  }
}