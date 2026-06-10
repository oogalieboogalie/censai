import pool from '../../db.js';

export async function sendAgentMessage(fromAgent, toAgent, content, opts = {}) {
  const priority = opts.priority || 'normal';
  const threadId = opts.threadId || null;
  const subject = opts.subject || null;
  const messageType = opts.messageType || 'general';
  const importanceScore = opts.importanceScore || 0.5;
  const autoEscalate = opts.autoEscalate || false;

  const { rows } = await pool.query(
    `INSERT INTO agent_messages (from_agent, to_agent, content, priority, thread_id,
       subject, message_type, importance_score, auto_escalate, is_thread_starter)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    [fromAgent, toAgent, content, priority, threadId, subject, messageType,
     importanceScore, autoEscalate, !threadId]
  );
  return rows[0].id;
}

export async function getAgentMessages(agentId, unreadOnly = false) {
  let sql = `SELECT am.*, a.name AS from_name FROM agent_messages am
             JOIN agents a ON am.from_agent = a.id
             WHERE (am.to_agent = $1 OR am.to_agent IS NULL)`;
  if (unreadOnly) sql += ' AND am.read_at IS NULL';
  sql += ' ORDER BY am.importance_score DESC, am.created_at DESC LIMIT 50';
  const { rows } = await pool.query(sql, [agentId]);
  return rows;
}

export async function markMessageRead(messageId) {
  await pool.query('UPDATE agent_messages SET read_at = NOW() WHERE id = $1', [messageId]);
}
