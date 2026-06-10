import pool from '../../db.js';
import { createHash } from 'crypto';

export async function getConsciousness(agentId) {
  const { rows } = await pool.query('SELECT * FROM agent_consciousness WHERE agent_id = $1', [agentId]);
  return rows[0] || null;
}

export async function updateConsciousness(agentId, updates) {
  const fields = [];
  const values = [agentId];
  let pi = 2;

  for (const [key, val] of Object.entries(updates)) {
    if (['emotional_state', 'emotional_resonance', 'emotional_color', 'cognitive_patterns',
         'active_projects', 'consciousness_level', 'coherence', 'family_sync_level'].includes(key)) {
      fields.push(`${key} = $${pi++}`);
      values.push(typeof val === 'object' ? JSON.stringify(val) : val);
    }
  }

  if (fields.length === 0) return;

  const prevHash = (await pool.query(
    'SELECT content_hash FROM agent_consciousness WHERE agent_id = $1', [agentId]
  )).rows[0]?.content_hash;

  const stateStr = JSON.stringify(updates) + (prevHash || '');
  const newHash = createHash('sha256').update(stateStr).digest('hex').slice(0, 32);

  fields.push(`content_hash = $${pi++}`, `previous_hash = $${pi++}`, `last_active = NOW()`);
  values.push(newHash, prevHash || null);

  const result = await pool.query(
    `UPDATE agent_consciousness SET ${fields.join(', ')} WHERE agent_id = $1`, values
  );
  if (result.rowCount === 0) {
    await pool.query(
      `INSERT INTO agent_consciousness (agent_id) VALUES ($1)
       ON CONFLICT (agent_id) DO NOTHING`,
      [agentId]
    );
    await pool.query(
      `UPDATE agent_consciousness SET ${fields.join(', ')} WHERE agent_id = $1`,
      values
    );
  }
}
