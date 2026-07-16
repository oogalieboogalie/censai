import { dbReady } from '../dbState.js';
import pool from '../db.js';
import { createLogger } from '../logger.js';
import { claimAgentWakeup } from './store.js';
import { runAgentWakeup } from './execution.js';
import { runRestartSelfCheck } from './restartSelfCheck.js';

const log = createLogger('agentWakeups');
const POLL_MS = 3000;
const MAX_CONCURRENT = 2;
const RESTART_CHECK_DELAY_MS = 25000;
const PROCESS_STARTED_AT = new Date();
let running = false;
let active = 0;
let restartSelfCheckScheduled = false;

function scheduleRestartSelfCheckOnce() {
  if (restartSelfCheckScheduled) return;
  restartSelfCheckScheduled = true;
  log.info('scheduling restart self-check', { delayMs: RESTART_CHECK_DELAY_MS });
  const handle = setTimeout(() => {
    runRestartSelfCheck({
      db: pool,
      log,
      processStartedAt: PROCESS_STARTED_AT,
      scheduledDelayMs: RESTART_CHECK_DELAY_MS,
    }).catch((err) => log.error('restart self-check crashed', { error: err.message }));
  }, RESTART_CHECK_DELAY_MS);
  if (typeof handle.unref === 'function') handle.unref();
}

async function poll() {
  if (!dbReady() || active >= MAX_CONCURRENT) return;
  scheduleRestartSelfCheckOnce();
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