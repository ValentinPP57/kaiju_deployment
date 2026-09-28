import { query } from '../config/database.js';

export class CalendarService {
  static async getByRange(from: string, to: string) {
    const result = await query(
      `SELECT ce.id,
              to_char(ce.event_date, 'YYYY-MM-DD') AS event_date,
              ce.title,
              ce.description,
              ce.created_by,
              u.email AS created_by_email,
              ce.created_at
       FROM "calendar_events" ce
       JOIN "users" u ON ce.created_by = u.id
       WHERE ce.event_date BETWEEN $1::date AND $2::date
       ORDER BY ce.event_date ASC, ce.created_at ASC`,
      [from, to]
    );
    return result.rows;
  }

  static async getById(id: number) {
    const result = await query(
      `SELECT id, created_by FROM "calendar_events" WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  static async create(data: {
    event_date: string;
    title: string;
    description: string;
    created_by: number;
  }) {
    const result = await query(
      `WITH inserted AS (
         INSERT INTO "calendar_events" (event_date, title, description, created_by)
         VALUES ($1::date, $2, $3, $4)
         RETURNING *
       )
       SELECT i.id,
              to_char(i.event_date, 'YYYY-MM-DD') AS event_date,
              i.title,
              i.description,
              i.created_by,
              u.email AS created_by_email,
              i.created_at
       FROM inserted i
       JOIN "users" u ON i.created_by = u.id`,
      [data.event_date, data.title, data.description, data.created_by]
    );
    return result.rows[0];
  }

  static async delete(id: number) {
    await query(`DELETE FROM "calendar_events" WHERE id = $1`, [id]);
  }
}