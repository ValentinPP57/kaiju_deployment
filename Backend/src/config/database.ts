import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Pool de connexion 
export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'kaiju_admin',
  password: process.env.DB_PASSWORD || 'kaiju_secret_pass',
  database: process.env.DB_NAME || 'kaiju_db',
});

// Requête raccourcis
export const query = (text: string, params?: any[]) => pool.query(text, params);