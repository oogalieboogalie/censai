import pool from './db.js';
import { getTaskWorkerStatus } from './taskWorker.js';
import { getSchedulerWorkerStatus } from './schedulerWorker.js';
import { checkQdrantHealth } from './qdrant.js';
import { getSecret } from './secrets.js';
import { setDbReady } from './dbState.js';

const DB_UNAVAILABLE_DEGRADED_STATE = 'database_unavailable';

export async function getSystemStatus() {
  let databaseConnected = false;
  let databaseError = null;
  try {
    await pool.query('SELECT 1');
    databaseConnected = true;
    setDbReady(true);
  } catch (err) {
    databaseConnected = false;
    databaseError = err.message;
    setDbReady(false);
  }

  const taskWorker = getTaskWorkerStatus(databaseConnected);
  const schedulerWorker = getSchedulerWorkerStatus();
  const qdrant = await checkQdrantHealth();

  const aiBaseUrl = (process.env.AI_BASE_URL || 'http://localhost:11434/v1').replace(/\/+$/, '');
  const aiModel = process.env.AI_MODEL || 'minimax-m2.5:cloud';
  const aiApiKey = getSecret('AI_API_KEY') || process.env.AI_API_KEY || 'ollama';

  const degradedState = !databaseConnected
    ? DB_UNAVAILABLE_DEGRADED_STATE
    : taskWorker.degraded
      ? taskWorker.degradedReason
      : null;

  const status = {
    ok: databaseConnected,
    ready: databaseConnected && !!aiApiKey, // DB is critical, AI key is critical for "ready"
    database: {
      connected: databaseConnected,
      ready: databaseConnected,
      error: databaseError,
    },
    qdrant: {
      ready: qdrant.ready,
      connected: qdrant.connected,
      error: qdrant.error,
    },
    modelProvider: {
      ready: !!aiApiKey,
      baseUrl: aiBaseUrl,
      model: aiModel,
      hasKey: !!aiApiKey,
    },
    taskWorker,
    schedulerWorker,
    degraded: Boolean(degradedState),
    degradedState,
  };

  return status;
}
