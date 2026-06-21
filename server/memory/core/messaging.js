import pool from '../../db.js';
import crypto from 'crypto';
import { enqueueAgentWakeup, shouldWakeForMessage } from '../../agent-wakeups/store.js';

/**
 * Generate an idempotency key for a message based on sender, recipient, and content.
 * @param {string} fromAgent - Sender agent ID
 * @param {string|null} toAgent - Recipient agent ID (can be null for broadcasts)
 * @param {string} content - Message content
 * @returns {string} - A SHA-256 hash used as idempotency key
 */
function generateMessageKey(fromAgent, toAgent, content) {
  const payload = `${fromAgent}:${toAgent || 'broadcast'}:${content}`;
  return crypto.createHash('sha256').update(payload).digest('hex').slice(0, 32);
}

/**
 * Send an agent message with idempotency protection.
 * If a message with the same idempotency key was sent recently (within 5 minutes),
 * returns the existing message ID instead of creating a duplicate.
 */
export async function sendAgentMessage(fromAgent, toAgent, content, opts = {}) {
  const priority = opts.priority || 'normal';
  const threadId = opts.threadId || null;
  const subject = opts.subject || null;
  const messageType = opts.messageType || 'general';
  const importanceScore = opts.importanceScore || 0.5;
  const autoEscalate = opts.autoEscalate || false;
  const idempotencyKey = opts.idempotencyKey || generateMessageKey(fromAgent, toAgent, content);

  // Check for existing message with same idempotency key (within last 5 minutes)
  const existing = await pool.query(
    `SELECT id FROM agent_messages 
     WHERE idempotency_key = $1 
       AND from_agent = $2 
       AND created_at > NOW() - INTERVAL '5 minutes'`,
    [idempotencyKey, fromAgent]
  );

  if (existing.rows.length > 0) {
    // Message already sent recently, return existing ID to prevent duplicate
    return existing.rows[0].id;
  }

  const { rows } = await pool.query(
    `INSERT INTO agent_messages (from_agent, to_agent, content, priority, thread_id,
       subject, message_type, importance_score, auto_escalate, is_thread_starter, idempotency_key)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
    [fromAgent, toAgent, content, priority, threadId, subject, messageType,
     importanceScore, autoEscalate, !threadId, idempotencyKey]
  );
  const messageId = rows[0].id;
  if (shouldWakeForMessage(fromAgent, toAgent, opts)) {
    await enqueueAgentWakeup(messageId, toAgent, fromAgent);
  }
  return messageId;
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
