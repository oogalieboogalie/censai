import pool from '../db.js';

const WAKEABLE_TYPES = new Set(['agent-to-agent', 'work_request', 'agent_report']);

export function shouldWakeForMessage(fromAgent, toAgent, opts = {}) {
  if (opts.wake === false || !toAgent || fromAgent === toAgent) return false;
  return WAKEABLE_TYPES.has(opts.messageType || 'general');
}

export async function enqueueAgentWakeup(messageId, agentId, senderId) {
  const { rows } = await pool.query(
    `INSERT INTO agent_wakeups(message_id, agent_id, sender_id)
     VALUES($1, $2, $3)
     ON CONFLICT(message_id) DO UPDATE SET updated_at = NOW()
     RETURNING *`,
    [messageId, agentId, senderId]
  );
  return rows[0];
}

export async function claimAgentWakeup() {
  const { rows } = await pool.query(
    `UPDATE agent_wakeups SET status='in_progress', started_at=NOW(),
       updated_at=NOW(), attempts=attempts+1
     WHERE id = (
       SELECT aw.id FROM agent_wakeups aw
       WHERE aw.status='queued'
          OR (aw.status='waiting_children' AND NOT EXISTS (
            SELECT 1 FROM agent_tasks t
            WHERE t.wake_id=aw.id AND t.status IN ('queued','in_progress','blocked')
          ))
       ORDER BY aw.created_at ASC
       FOR UPDATE SKIP LOCKED LIMIT 1
     )
     RETURNING *`
  );
  return rows[0] || null;
}

export async function loadWakeupContext(wakeId) {
  const { rows } = await pool.query(
    `SELECT aw.*, am.content, am.subject, am.message_type, am.thread_id,
            sender.name AS sender_name
     FROM agent_wakeups aw
     JOIN agent_messages am ON am.id=aw.message_id
     JOIN agents sender ON sender.id=aw.sender_id
     WHERE aw.id=$1`,
    [wakeId]
  );
  return rows[0] || null;
}

export async function getWakeupTasks(wakeId) {
  const { rows } = await pool.query(
    `SELECT id, title, status, result, error, completion_receipt
     FROM agent_tasks WHERE wake_id=$1 ORDER BY created_at`,
    [wakeId]
  );
  return rows;
}

export async function updateWakeup(id, patch) {
  const allowed = ['status', 'phase', 'response', 'error'];
  const fields = [];
  const values = [];
  for (const key of allowed) {
    if (!Object.prototype.hasOwnProperty.call(patch, key)) continue;
    values.push(patch[key]);
    fields.push(`${key}=$${values.length}`);
  }
  if (patch.status === 'completed' || patch.status === 'failed') {
    fields.push('completed_at=NOW()');
  }
  fields.push('updated_at=NOW()');
  values.push(id);
  const { rows } = await pool.query(
    `UPDATE agent_wakeups SET ${fields.join(', ')} WHERE id=$${values.length} RETURNING *`,
    values
  );
  return rows[0] || null;
}
