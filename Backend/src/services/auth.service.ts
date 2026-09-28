import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';

export type OfficerRole = 'QC' | 'LC' | 'CD';

export class AuthService {
  static async register(data: { email: string; password: string; role?: OfficerRole; quarter_id?: number }) {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const role: OfficerRole = data.role || 'LC';

    const result = await query(
      `INSERT INTO "users" ("email", "password", "role")
       VALUES ($1, $2, $3)
       RETURNING "id", "email", "role", "created_at"`,
      [data.email, hashedPassword, role]
    );

    const user = result.rows[0];

    if (role === 'QC' && data.quarter_id) {
      await query(
        `INSERT INTO "user_quarters" ("user_id", "quarter_id") VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [user.id, data.quarter_id]
      );
    }

    return user;
  }

  static async login(email: string, password: string) {
    const result = await query('SELECT * FROM "users" WHERE "email" = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      throw new Error('Invalides credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalides credentials');
    }

    let quarterId: number | null = null;
    if (user.role === 'QC') {
      const uq = await query(
        `SELECT quarter_id FROM "user_quarters" WHERE user_id = $1 LIMIT 1`,
        [user.id]
      );
      quarterId = uq.rows[0]?.quarter_id ?? null;
    }

    const secret = process.env.JWT_SECRET || 'super_secret_key';
    const token = jwt.sign(
      { userId: user.id, role: user.role, quarterId },
      secret,
      { expiresIn: '24h' }
    );

    const { password: userPassword, ...userWithoutPassword } = user;
    return { user: { ...userWithoutPassword, quarterId }, token };
  }
}