import pool from '../db.js';
import { setDbReady } from '../dbState.js';
import { initSecrets } from '../secrets.js';
import { ensureAgentTaskReceiptSchema } from '../memory/tasks.js';
import { ensureJulesTaskSyncSchema } from '../jules-task-sync/index.js';
import { createLogger } from '../logger.js';

const log = createLogger('boot-db');

export async function checkDb() {
  try {
    await pool.query('SELECT 1');
    await ensureAgentTaskReceiptSchema();
    await ensureJulesTaskSyncSchema();
    setDbReady(true);
    log.info('PostgreSQL connected');
    await initSecrets();
  } catch (err) {
    log.warn('PostgreSQL not available — memory system disabled, chat still works', { error: err.message });
    await initSecrets();
  }
}
