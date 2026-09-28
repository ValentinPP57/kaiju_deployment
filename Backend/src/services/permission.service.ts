import { query } from '../config/database.js';

export class PermissionService {
  static async hasPermission(role: string, action: string, disasterLevel: number): Promise<boolean> {
    const result = await query(
      `SELECT 1 FROM "permissions" WHERE role = $1 AND action = $2 AND disaster_level = $3`,
      [role, action, disasterLevel]
    );
    return result.rows.length > 0;
  }
}