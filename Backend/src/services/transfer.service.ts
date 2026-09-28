import { query, pool } from '../config/database.js';
import { DisasterService } from './disaster.service.js';
import { PermissionService } from './permission.service.js';

export class TransferService {
  static async getAll() {
    const result = await query(
      `SELECT t.*, 
              sq.name as source_quarter, 
              dq.name as destination_quarter, 
              rt.name as resource_name,
              u.email as requested_by_email
       FROM "transfers" t
       JOIN "quarters" sq ON t.source_quarter_id = sq.id
       JOIN "quarters" dq ON t.destination_quarter_id = dq.id
       JOIN "resource_types" rt ON t.resource_type_id = rt.id
       JOIN "users" u ON t.requested_by = u.id
       ORDER BY t.created_at DESC`
    );
    return result.rows;
  }

  static async getById(id: number) {
    const result = await query(`SELECT * FROM "transfers" WHERE id = $1`, [id]);
    return result.rows[0] || null;
  }

  static async getLegs(transferId: number) {
    const result = await query(
      `SELECT * FROM "transfer_legs" WHERE transfer_id = $1 ORDER BY step_order ASC`,
      [transferId]
    );
    return result.rows;
  }

  // Étapes en attente
  static async getPendingLegs(role: string, quarterId: number | null) {
    let text = `
      SELECT tl.*, t.quantity, t.status as transfer_status,
             rt.name as resource_name,
             fq.name as from_quarter_name, tq.name as to_quarter_name
      FROM "transfer_legs" tl
      JOIN "transfers" t ON tl.transfer_id = t.id
      JOIN "resource_types" rt ON t.resource_type_id = rt.id
      JOIN "quarters" fq ON tl.from_quarter_id = fq.id
      JOIN "quarters" tq ON tl.to_quarter_id = tq.id
      WHERE tl.status = 'pending'
    `;
    const params: any[] = [];
    if (role === 'QC') {
      text += ` AND tl.from_quarter_id = $1`;
      params.push(quarterId);
    }
    text += ` ORDER BY tl.step_order ASC`;
    const result = await query(text, params);
    return result.rows;
  }

  private static async getAdjacencyMap(): Promise<Record<number, number[]>> {
    const result = await query(`SELECT quarter_id, neighbor_id FROM "quarter_adjacency"`);
    const map: Record<number, number[]> = {};
    for (const row of result.rows) {
      if (!map[row.quarter_id]) map[row.quarter_id] = [];
      map[row.quarter_id].push(row.neighbor_id);
    }
    return map;
  }

  private static findPath(
    adjacencyMap: Record<number, number[]>,
    sourceId: number,
    destId: number
  ): number[] | null {
    const queue: number[][] = [[sourceId]];
    const visited = new Set([sourceId]);

    while (queue.length > 0) {
      const path = queue.shift()!;
      const last = path[path.length - 1];
      if (last === destId) return path;

      for (const neighbor of adjacencyMap[last] || []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push([...path, neighbor]);
        }
      }
    }
    return null;
  }

  static async create(data: {
    source_quarter_id: number;
    destination_quarter_id: number;
    resource_type_id: number;
    quantity: number;
    requested_by: number;
    requester_role: string;
    route?: 'land' | 'sea';
  }) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      if (data.source_quarter_id === data.destination_quarter_id) {
        throw new Error('quaters can\'t be the same');
      }

      // Recherche de chemin
      const adjacencyMap = await TransferService.getAdjacencyMap();
      const path = TransferService.findPath(adjacencyMap, data.source_quarter_id, data.destination_quarter_id);
      if (!path) {
        throw new Error('refused, no route found');
      }

      // Vérification de permission
      const globalLevel = await DisasterService.getComputedGlobalLevel();
      const action = path.length > 2 ? 'organize_transit' : 'request_adjacent_transfer';
      const allowed = await PermissionService.hasPermission(data.requester_role, action, globalLevel);
      if (!allowed) {
        throw new Error(
          `Refused :"${action}" can't be done by ${data.requester_role} at level ${globalLevel}`
        );
      }

      // Vérification du stock et du seuil
      const stockRes = await client.query(
        `SELECT current_quantity, initial_quantity FROM "inventories" 
         WHERE quarter_id = $1 AND resource_type_id = $2 FOR UPDATE`,
        [data.source_quarter_id, data.resource_type_id]
      );
      if (stockRes.rows.length === 0) {
        throw new Error('Ressources not found in this quarter');
      }
      const { current_quantity, initial_quantity } = stockRes.rows[0];

      const cityStateRes = await client.query('SELECT retention_rate FROM "city_state" WHERE id = 1');
      const retentionRate = Number(cityStateRes.rows[0]?.retention_rate ?? 0.3);
      const threshold = Math.ceil((initial_quantity || 0) * retentionRate);

      if (current_quantity - data.quantity < threshold) {
        throw new Error(`Refused : cant go under the retention rate : (${threshold})`);
      }

      // Création du transfert
      const transferRes = await client.query(
        `INSERT INTO "transfers" (
          resource_type_id, source_quarter_id, destination_quarter_id, 
          quantity, route, status, requested_by, level_at_request
        ) VALUES ($1,$2,$3,$4,$5,'pending',$6,$7)
        RETURNING *`,
        [
          data.resource_type_id,
          data.source_quarter_id,
          data.destination_quarter_id,
          data.quantity,
          data.route || 'land',
          data.requested_by,
          globalLevel,
        ]
      );
      const transfer = transferRes.rows[0];

      // Création des étapes
      for (let i = 0; i < path.length - 1; i++) {
        await client.query(
          `INSERT INTO "transfer_legs" (transfer_id, step_order, from_quarter_id, to_quarter_id, status)
           VALUES ($1,$2,$3,$4,'pending')`,
          [transfer.id, i + 1, path[i], path[i + 1]]
        );
      }

      await client.query(
        `INSERT INTO "transfer_events" (transfer_id, event_type, actor_id) VALUES ($1,'created',$2)`,
        [transfer.id, data.requested_by]
      );

      await client.query('COMMIT');
      return transfer;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async approveLeg(legId: number, approverId: number, approverRole: string, approverQuarterId: number | null) {
    const client = await pool.connect();
    let finalizationError: string | null = null;
    let transferId: number;

    try {
      await client.query('BEGIN');

      const legRes = await client.query(`SELECT * FROM "transfer_legs" WHERE id = $1 FOR UPDATE`, [legId]);
      const leg = legRes.rows[0];
      if (!leg) throw new Error('Step not found');
      if (leg.status !== 'pending') throw new Error('This step has already been done');
      if (approverRole === 'QC' && approverQuarterId !== leg.from_quarter_id) {
        throw new Error('You can\'t approve other quarter transfers');
      }
      transferId = leg.transfer_id;

      await client.query(
        `UPDATE "transfer_legs" SET status = 'approved', approved_by = $1, decided_at = NOW() WHERE id = $2`,
        [approverId, legId]
      );
      await client.query(
        `INSERT INTO "transfer_events" (transfer_id, event_type, actor_id) VALUES ($1,'leg_approved',$2)`,
        [transferId, approverId]
      );

      const transferRes = await client.query(`SELECT * FROM "transfers" WHERE id = $1 FOR UPDATE`, [transferId]);
      const transfer = transferRes.rows[0];

      const remaining = await client.query(
        `SELECT COUNT(*) FROM "transfer_legs" WHERE transfer_id = $1 AND status != 'approved'`,
        [transferId]
      );

      if (Number(remaining.rows[0].count) === 0) {
        const stockRes = await client.query(
          `SELECT current_quantity, initial_quantity FROM "inventories" 
           WHERE quarter_id = $1 AND resource_type_id = $2 FOR UPDATE`,
          [transfer.source_quarter_id, transfer.resource_type_id]
        );
        const { current_quantity, initial_quantity } = stockRes.rows[0];
        const cityStateRes = await client.query('SELECT retention_rate FROM "city_state" WHERE id = 1');
        const retentionRate = Number(cityStateRes.rows[0]?.retention_rate ?? 0.3);
        const threshold = Math.ceil((initial_quantity || 0) * retentionRate);

        if (current_quantity - transfer.quantity < threshold) {
          await client.query(`UPDATE "transfers" SET status = 'rejected' WHERE id = $1`, [transferId]);
          await client.query(
            `INSERT INTO "transfer_events" (transfer_id, event_type, rule_violated, actor_id) VALUES ($1,'auto_rejected','retention_threshold',$2)`,
            [transferId, approverId]
          );
          finalizationError = 'Stock too low';
        } else {
          await client.query(
            `UPDATE "inventories" SET current_quantity = current_quantity - $1 WHERE quarter_id = $2 AND resource_type_id = $3`,
            [transfer.quantity, transfer.source_quarter_id, transfer.resource_type_id]
          );
          await client.query(
            `UPDATE "inventories" SET current_quantity = current_quantity + $1 WHERE quarter_id = $2 AND resource_type_id = $3`,
            [transfer.quantity, transfer.destination_quarter_id, transfer.resource_type_id]
          );
          await client.query(
            `UPDATE "transfers" SET status = 'delivered', completed_at = NOW() WHERE id = $1`,
            [transferId]
          );
          await client.query(
            `INSERT INTO "transfer_events" (transfer_id, event_type, actor_id) VALUES ($1,'delivered',$2)`,
            [transferId, approverId]
          );
        }
      } else if (transfer.status === 'pending') {
        await client.query(`UPDATE "transfers" SET status = 'in_transit' WHERE id = $1`, [transferId]);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    if (finalizationError) throw new Error(finalizationError);
    return await TransferService.getById(transferId!);
  }

  static async rejectLeg(legId: number, approverId: number, approverRole: string, approverQuarterId: number | null) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const legRes = await client.query(`SELECT * FROM "transfer_legs" WHERE id = $1 FOR UPDATE`, [legId]);
      const leg = legRes.rows[0];
      if (!leg) throw new Error('Step not found');
      if (leg.status !== 'pending') throw new Error('Step already done');
      if (approverRole === 'QC' && approverQuarterId !== leg.from_quarter_id) {
        throw new Error('');
      }

      await client.query(
        `UPDATE "transfer_legs" SET status = 'rejected', approved_by = $1, decided_at = NOW() WHERE id = $2`,
        [approverId, legId]
      );
      await client.query(
        `UPDATE "transfer_legs" SET status = 'rejected' WHERE transfer_id = $1 AND status = 'pending'`,
        [leg.transfer_id]
      );
      await client.query(`UPDATE "transfers" SET status = 'rejected' WHERE id = $1`, [leg.transfer_id]);
      await client.query(
        `INSERT INTO "transfer_events" (transfer_id, event_type, rule_violated, actor_id) VALUES ($1,'leg_rejected','manual_rejection',$2)`,
        [leg.transfer_id, approverId]
      );

      await client.query('COMMIT');
      return await TransferService.getById(leg.transfer_id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async cancel(transferId: number, requesterId: number, requesterRole: string) {
    const transfer = await TransferService.getById(transferId);
    if (!transfer) throw new Error('Transfert introuvable');
    if (!['pending', 'in_transit'].includes(transfer.status)) {
      throw new Error('This can\'t be canceled');
    }
    if (transfer.requested_by !== requesterId && requesterRole !== 'CD') {
      throw new Error('You can only refuse your request');
    }

    await query(`UPDATE "transfers" SET status = 'cancelled' WHERE id = $1`, [transferId]);
    await query(
      `UPDATE "transfer_legs" SET status = 'rejected' WHERE transfer_id = $1 AND status = 'pending'`,
      [transferId]
    );
    await query(
      `INSERT INTO "transfer_events" (transfer_id, event_type, actor_id) VALUES ($1,'cancelled',$2)`,
      [transferId, requesterId]
    );

    return await TransferService.getById(transferId);
  }
}