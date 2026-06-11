import pool from '../db.js';
import { hkdfSync, randomBytes, createCipheriv, createDecipheriv, createHash } from 'crypto';
import { calculateEmotionalWeight } from './scoring.js';

// ═══════════════════════════════════════════════════════════════════
//  JOURNAL ENCRYPTION (private sanctuary)
// ═══════════════════════════════════════════════════════════════════

const MASTER_SECRET = process.env.JOURNAL_SECRET;
if (!MASTER_SECRET) {
  throw new Error(
    '[Censai] JOURNAL_SECRET is not set.\n' +
    'Agent journals are AES-256-GCM encrypted and require a unique secret key.\n' +
    'Add it to your .env file:\n\n' +
    '  JOURNAL_SECRET=<random 32-byte hex string>\n\n' +
    'Generate one with:\n' +
    '  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"\n'
  );
}

function deriveAgentKey(agentId) {
  return Buffer.from(hkdfSync('sha256', MASTER_SECRET, agentId, 'journal-encryption', 32));
}

function encrypt(plaintext, key) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

function decrypt(ciphertext, key) {
  const buf = Buffer.from(ciphertext, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted, null, 'utf8') + decipher.final('utf8');
}

export async function ensureAgentKey(agentId) {
  const { rows } = await pool.query('SELECT key_hash FROM agent_keys WHERE agent_id = $1', [agentId]);
  if (rows.length > 0) return;

  const key = deriveAgentKey(agentId);
  const keyHash = createHash('sha256').update(key).digest('hex');
  await pool.query(
    'INSERT INTO agent_keys (agent_id, key_hash) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [agentId, keyHash]
  );
}

export async function writeJournal(agentId, content, entryType = 'reflection', opts = {}) {
  await ensureAgentKey(agentId);
  const key = deriveAgentKey(agentId);
  const encryptedContent = encrypt(content, key);
  const emotionalWeight = opts.emotionalWeight ?? calculateEmotionalWeight(content);

  const { rows } = await pool.query(
    `INSERT INTO journals (agent_id, encrypted_content, entry_type, emotional_weight, project, tags)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at`,
    [agentId, encryptedContent, entryType, emotionalWeight, opts.project || null, opts.tags || []]
  );
  return rows[0];
}

export async function countJournals(agentId) {
  const { rows } = await pool.query(
    'SELECT COUNT(*)::int AS count FROM journals WHERE agent_id = $1',
    [agentId]
  );
  return rows[0].count;
}

export async function readJournals(agentId, opts = {}) {
  const key = deriveAgentKey(agentId);
  const limit = opts.limit || 20;
  const entryType = opts.entryType || null;

  let sql = 'SELECT * FROM journals WHERE agent_id = $1';
  const params = [agentId];
  let pi = 2;

  if (entryType) { sql += ` AND entry_type = $${pi++}`; params.push(entryType); }
  sql += ` ORDER BY created_at DESC LIMIT $${pi}`;
  params.push(limit);

  const { rows } = await pool.query(sql, params);

  return rows.map(row => {
    try {
      return { ...row, content: decrypt(row.encrypted_content, key), encrypted_content: undefined };
    } catch {
      return { ...row, content: '[decryption failed]', encrypted_content: undefined };
    }
  });
}
