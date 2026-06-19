import pool from '../db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function ensureAttributeSchema() {
  try {
    const sqlPath = path.resolve(path.join(__dirname, '..', '..', 'docker', '022-agent-attributes.sql'));
    const sql = await fs.promises.readFile(sqlPath, 'utf8');
    await pool.query(sql);
  } catch (err) {
    console.error('Failed to run agent attributes database schema migration:', err);
    throw err;
  }
}
