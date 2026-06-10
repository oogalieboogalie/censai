import { dbReady } from './dbState.js';
import { claimNextDueSchedule, updateSchedule } from './memory/schedules.js';
import { createAgentTask } from './memory/tasks.js';
import { getAllSubAgents } from './memory/subagents.js';
import { calculateNextRun } from './memory/schedules_utils.js';
import { createLogger } from './logger.js';

const log = createLogger('scheduler');
const POLL_INTERVAL_MS = Math.max(5000, Number(process.env.SCHEDULER_POLL_INTERVAL_MS) || 30000);

let running = false;
let tickBusy = false;
let activeScheduleId = null;
let lastPollError = null;
let intervalHandle = null;

function normalizeScheduledAssignee(value) {
  return String(value || '').trim().toLowerCase();
}

export function resolveScheduledAssigneeId(requestedAgentId, subAgents = []) {
  const normalizedRequested = normalizeScheduledAssignee(requestedAgentId);
  if (!normalizedRequested) return null;

  const exactIdMatch = subAgents.find((subAgent) => normalizeScheduledAssignee(subAgent.id) === normalizedRequested);
  if (exactIdMatch) return exactIdMatch.id;

  const nameMatches = subAgents.filter((subAgent) => normalizeScheduledAssignee(subAgent.name) === normalizedRequested);
  if (nameMatches.length > 0) return nameMatches[0].id;

  const prefixMatches = subAgents.filter((subAgent) => normalizeScheduledAssignee(subAgent.id).startsWith(`${normalizedRequested}-`));
  if (prefixMatches.length > 0) return prefixMatches[0].id;

  return null;
}

function getScheduleProjectReference(schedule) {
  return String(
    schedule.project_ref
      || schedule.project_id
      || schedule.project_repo
      || schedule.project_path
      || schedule.project_name
      || ''
  ).trim();
}

function buildTaskPrompt(schedule) {
  const projectReference = getScheduleProjectReference(schedule);
  return [
    schedule.task_text,
    '',
    schedule.project_name ? `Project: ${schedule.project_name}` : null,
    projectReference ? `Project tool reference: ${projectReference}` : null,
    schedule.project_repo ? `Project repo: ${schedule.project_repo}` : null,
    schedule.project_path ? `Project path: ${schedule.project_path}` : null,
    schedule.document_target ? `Document target: ${schedule.document_target}` : null,
    projectReference ? `When you use project tools, pass project: "${projectReference}".` : null,
  ].filter(Boolean).join('\n');
}

async function failSchedule(schedule, err) {
  await updateSchedule(schedule.id, {
    status: 'failed',
    last_error: err.message,
  });
}

async function completeOrRepeatSchedule(schedule) {
  if (schedule.repeat_enabled) {
    const nextRun = calculateNextRun(schedule.next_run_at || new Date(), schedule.repeat_freq, schedule.repeat_days);
    await updateSchedule(schedule.id, {
      status: 'active',
      next_run_at: nextRun,
      last_error: null,
    });
    return;
  }

  await updateSchedule(schedule.id, {
    status: 'completed',
    last_error: null,
  });
}

async function tickScheduler() {
  if (tickBusy) return;
  if (!dbReady()) {
    lastPollError = 'database_unavailable';
    return;
  }

  tickBusy = true;
  try {
    const schedule = await claimNextDueSchedule();
    if (!schedule) {
      lastPollError = null;
      return;
    }

    activeScheduleId = schedule.id;
    const subAgents = await getAllSubAgents();
    const assigneeId = resolveScheduledAssigneeId(schedule.agent_id, subAgents);
    if (!assigneeId) {
      throw new Error(`No active sub-agent matches scheduled assignee "${schedule.agent_id}".`);
    }

    if (assigneeId !== schedule.agent_id) {
      await updateSchedule(schedule.id, { agent_id: assigneeId });
    }

    await createAgentTask({
      parentId: 'scheduler',
      assigneeId,
      projectId: schedule.project_id || null,
      project: getScheduleProjectReference(schedule) || schedule.project_name,
      title: `[Scheduled] ${String(schedule.task_text || '').slice(0, 50)}...`,
      prompt: buildTaskPrompt(schedule),
      priority: 'normal',
    });

    log.info('schedule fired → task queued', { scheduleId: schedule.id, assignee: assigneeId, repeat: !!schedule.repeat_enabled });
    await completeOrRepeatSchedule(schedule);
    lastPollError = null;
  } catch (err) {
    lastPollError = err.message;
    if (activeScheduleId) {
      await failSchedule({ id: activeScheduleId }, err).catch(() => {});
    }
    log.error('tick error', { scheduleId: activeScheduleId, error: err.message });
  } finally {
    activeScheduleId = null;
    tickBusy = false;
  }
}

export function getSchedulerWorkerStatus() {
  return {
    ready: running && dbReady(),
    running,
    activeScheduleId,
    pollIntervalMs: POLL_INTERVAL_MS,
    lastPollError,
  };
}

export function startSchedulerWorker() {
  if (running) return;
  running = true;
  log.info('scheduler worker enabled', { pollIntervalMs: POLL_INTERVAL_MS });
  intervalHandle = setInterval(tickScheduler, POLL_INTERVAL_MS);
  setTimeout(tickScheduler, 5000);
}

export function stopSchedulerWorkerForTests() {
  if (intervalHandle) clearInterval(intervalHandle);
  intervalHandle = null;
  running = false;
  tickBusy = false;
  activeScheduleId = null;
  lastPollError = null;
}
