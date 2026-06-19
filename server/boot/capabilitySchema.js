import pool from '../db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function ensureCapabilitySchema() {
  try {
    const sqlPath = path.resolve(path.join(__dirname, '..', '..', 'docker', '021-agent-capabilities.sql'));
    const sql = await fs.promises.readFile(sqlPath, 'utf8');
    await pool.query(sql);
  } catch (err) {
    console.error('Failed to run agent capabilities database schema migration:', err);
    throw err;
  }
}
