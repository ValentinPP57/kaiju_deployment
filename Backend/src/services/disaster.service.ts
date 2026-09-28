import { query, pool } from '../config/database.js';

export class DisasterService {
  // Récupère le niveau actuel
  static async getCurrentState() {
    const result = await query(
      `SELECT cs.*, u.email as updated_by_email 
       FROM "city_state" cs 
       LEFT JOIN "users" u ON cs.updated_by = u.id 
       WHERE cs.id = 1`
    );
    return result.rows[0];
  }

  static async getQuarterState(quarterId: number) {
    const result = await query(
      `SELECT id, name, disaster_level FROM "quarters" WHERE id = $1`,
      [quarterId]
    );
    
    if (result.rows.length === 0) {
      throw new Error("Quarter not found");
    }
    return result.rows[0];
  }

  static async getAllQuarterStates() {
    const result = await query(
      `SELECT id, code, name, disaster_level, sea_access, is_hub FROM "quarters" ORDER BY id ASC`
    );
    return result.rows;
  }

  static async updateQuarterLevel(quarterId: number, newLevel: number) {
    if (newLevel < 1 || newLevel > 5) {
      throw new Error("level must be between 1 and 5");
    }

    const result = await query(
      `UPDATE "quarters" SET disaster_level = $1 WHERE id = $2 RETURNING id, code, name, disaster_level`,
      [newLevel, quarterId]
    );

    if (result.rows.length === 0) {
      throw new Error("Quarter not found");
    }

    return result.rows[0];
  }

  // Modifie le niveau
  static async updateLevel(newLevel: number, userId: number) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const currentState = await client.query('SELECT disaster_level FROM "city_state" WHERE id = 1');
      const previousLevel = currentState.rows[0]?.disaster_level || 1;

      // Ajout dans l'historique
      await client.query(
        `INSERT INTO "disaster_level_changes" ("previous_level", "new_level", "changed_by")
         VALUES ($1, $2, $3)`,
        [previousLevel, newLevel, userId]
      );

      // Mise à jour du niveau
      const result = await client.query(
        `UPDATE "city_state" 
         SET "disaster_level" = $1, "updated_by" = $2, "updated_at" = NOW() 
         WHERE id = 1 
         RETURNING *`,
        [newLevel, userId]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async getComputedGlobalLevel(): Promise<number> {
  const quarters = await this.getAllQuarterStates();
  if (quarters.length === 0) return 0;

  const avg = quarters.reduce((sum, q) => sum + (q.disaster_level || 0), 0) / quarters.length;
  return Math.round(avg);
}

  static async updateRetentionRate(rate: number, updatedBy: number) {
    const result = await query(
      `UPDATE city_state
      SET retention_rate = $1
      WHERE id = 1
      RETURNING *`,
      [rate]
    );
    return result.rows[0];
  }

  // Récupère l'historique
  static async getHistory() {
    const result = await query(
      `SELECT dlc.*, u.email as changed_by_email 
       FROM "disaster_level_changes" dlc
       JOIN "users" u ON dlc.changed_by = u.id
       ORDER BY dlc.created_at DESC`
    );
    return result.rows;
  }
}