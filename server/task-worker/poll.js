import { dbReady } from '../dbState.js';
import { 
  log, state, MAX_CONCURRENT, POLL_INTERVAL_MS, DB_UNAVAILABLE_WORKER_MESSAGE 
} from './shared.js';
import { claimTask } from './claim.js';
import { runTask } from './execution.js';

async function poll() {
  if (state.activeCount >= MAX_CONCURRENT) return;
  if (!dbReady()) {
    state.disabledReason = 'database_unavailable';
    return;
  }
  if (state.disabledReason === 'database_unavailable') {
    state.disabledReason = null;
    log.info('task worker activated — database connected');
  }
  try {
    const task = await claimTask();
    if (!task) return;
    state.lastPollError = null;
    state.activeCount++;
    runTask(task).finally(() => { state.activeCount--; });
  } catch (err) {
    state.lastPollError = err.message;
    log.error('poll error', { error: err.message });
  }
}

export function startTaskWorker() {
  if (state.running) return;
  if (!dbReady()) {
    // Keep polling anyway: the readiness loop in boot/database.js may bring
    // the database online later, and poll() gates on dbReady() per tick.
    state.disabledReason = 'database_unavailable';
    log.warn(`${DB_UNAVAILABLE_WORKER_MESSAGE} — will activate when the database connects`);
  } else {
    state.disabledReason = null;
    log.info('task worker enabled', { pollIntervalMs: POLL_INTERVAL_MS, maxConcurrent: MAX_CONCURRENT });
  }
  state.running = true;
  setInterval(poll, POLL_INTERVAL_MS);
}
