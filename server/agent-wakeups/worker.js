import { dbReady } from '../dbState.js';
import { createLogger } from '../logger.js';
import { claimAgentWakeup } from './store.js';
import { runAgentWakeup } from './execution.js';

const log = createLogger('agentWakeups');
const POLL_MS = 3000;
const MAX_CONCURRENT = 2;
let running = false;
let active = 0;

async function poll() {
  if (!dbReady() || active >= MAX_CONCURRENT) return;
  try {
    const wake = await claimAgentWakeup();
    if (!wake) return;
    active += 1;
    runAgentWakeup(wake)
      .catch(err => log.error('wake failed', { wakeId: wake.id, error: err.message }))
      .finally(() => { active -= 1; });
  } catch (err) {
    log.error('poll failed', { error: err.message });
  }
}

export function startAgentWakeupWorker() {
  if (running) return;
  running = true;
  log.info('agent wakeup worker enabled', { pollIntervalMs: POLL_MS, maxConcurrent: MAX_CONCURRENT });
  const timer = setInterval(poll, POLL_MS);
  if (typeof timer.unref === 'function') timer.unref();
}
