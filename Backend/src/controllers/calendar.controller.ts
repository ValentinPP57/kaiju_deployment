import { Response } from 'express';
import { CalendarService } from '../services/calendar.service.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TITLE_MAX_LENGTH = 150;
const DESCRIPTION_MAX_LENGTH = 2000;

function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_REGEX.test(value)) return false;

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export class CalendarController {
  static async getByRange(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { from, to } = req.query;

      if (!isValidDate(from) || !isValidDate(to)) {
        res.status(400).json({ error: 'format : YYYY-MM-DD)' });
        return;
      }

      if (from > to) {
        res.status(400).json({ error: 'wrong format' });
        return;
      }

      const events = await CalendarService.getByRange(from, to);
      res.status(200).json(events);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  // POST /api/calendar
  static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { event_date, title, description } = req.body;

      if (!isValidDate(event_date)) {
        res.status(400).json({ error: 'format : YYYY-MM-DD)' });
        return;
      }

      const cleanTitle = typeof title === 'string' ? title.trim() : '';
      if (cleanTitle.length === 0 || cleanTitle.length > TITLE_MAX_LENGTH) {
        res.status(400).json({ error: `title needed (${TITLE_MAX_LENGTH} maximum length)` });
        return;
      }

      const cleanDescription = typeof description === 'string' ? description.trim() : '';
      if (cleanDescription.length > DESCRIPTION_MAX_LENGTH) {
        res.status(400).json({ error: `description too long (${DESCRIPTION_MAX_LENGTH} maximum length)` });
        return;
      }

      if (!req.user?.userId) {
        res.status(401).json({ error: 'unregistered user' });
        return;
      }

      const event = await CalendarService.create({
        event_date,
        title: cleanTitle,
        description: cleanDescription,
        created_by: req.user.userId,
      });

      res.status(201).json({ message: 'Event created', event });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const eventId = parseInt(req.params.id, 10);
      if (isNaN(eventId)) {
        res.status(400).json({ error: "ID invalide" });
        return;
      }

      if (!req.user?.userId) {
        res.status(401).json({ error: 'unregistered user' });
        return;
      }

      const event = await CalendarService.getById(eventId);
      if (!event) {
        res.status(404).json({ error: 'missing event' });
        return;
      }

      if (event.created_by !== req.user.userId && req.user.role !== 'CD') {
        res.status(403).json({ error: 'only CD or author can delete' });
        return;
      }

      await CalendarService.delete(eventId);
      res.status(200).json({ message: 'Event deleted' });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }
}