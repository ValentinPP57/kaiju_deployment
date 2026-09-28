import { Response } from 'express';
import { TransferService } from '../services/transfer.service.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

export class TransferController {
  static async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const transfers = await TransferService.getAll();
      res.status(200).json(transfers);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  static async getPendingLegs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unregistered user' });
        return;
      }
      const legs = await TransferService.getPendingLegs(req.user.role, req.user.quarterId ?? null);
      res.status(200).json(legs);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { source_quarter_id, destination_quarter_id, resource_type_id, quantity, route } = req.body;

      if (!source_quarter_id || !destination_quarter_id || !resource_type_id || !quantity) {
        res.status(400).json({ error: 'missing infos' });
        return;
      }
      if (!req.user?.userId) {
        res.status(401).json({ error: 'Unregistered user' });
        return;
      }

      const newTransfer = await TransferService.create({
        source_quarter_id,
        destination_quarter_id,
        resource_type_id,
        quantity,
        route,
        requested_by: req.user.userId,
        requester_role: req.user.role,
      });

      res.status(201).json({ message: 'transfert created', transfer: newTransfer });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  static async approveLeg(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const legId = parseInt(req.params.legId, 10);
      if (isNaN(legId)) {
        res.status(400).json({ error: 'invalide ID' });
        return;
      }
      if (!req.user?.userId) {
        res.status(401).json({ error: 'Unregistered user' });
        return;
      }

      const updated = await TransferService.approveLeg(legId, req.user.userId, req.user.role, req.user.quarterId ?? null);
      res.status(200).json({ message: 'approuved', transfer: updated });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  static async rejectLeg(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const legId = parseInt(req.params.legId, 10);
      if (isNaN(legId)) {
        res.status(400).json({ error: 'invalide ID' });
        return;
      }
      if (!req.user?.userId) {
        res.status(401).json({ error: 'Unregistered user' });
        return;
      }

      const updated = await TransferService.rejectLeg(legId, req.user.userId, req.user.role, req.user.quarterId ?? null);
      res.status(200).json({ message: 'refused', transfer: updated });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  static async cancel(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const transferId = parseInt(req.params.id, 10);
      if (isNaN(transferId)) {
        res.status(400).json({ error: 'invalide ID' });
        return;
      }
      if (!req.user?.userId) {
        res.status(401).json({ error: 'Unregistered user' });
        return;
      }

      const updated = await TransferService.cancel(transferId, req.user.userId, req.user.role);
      res.status(200).json({ message: 'canceled', transfer: updated });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }
}