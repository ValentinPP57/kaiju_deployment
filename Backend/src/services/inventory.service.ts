import { query } from '../config/database.js';

export class InventoryService {
  // Récupère l'inventaire d'un quartier
  static async getByQuarter(quarterId: number) {
    const result = await query(
      `SELECT i.*, rt.code as resource_code, rt.name as resource_name
       FROM "inventories" i
       JOIN "resource_types" rt ON i.resource_type_id = rt.id
       WHERE i.quarter_id = $1`,
      [quarterId]
    );
    return result.rows;
  }
}