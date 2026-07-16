// Agent Registry — invocation handlers.
// D2 of the marketplace/registry push.
//
// D3 will replace this with a streaming WS endpoint. For D2 we use an
// in-memory task store: tasks are keyed by id and survive within a
// single process lifetime. This is acceptable because:
//   - D2 is the REST stub; D3 introduces the durable, observable path
//   - the brief explicitly says "D3 will replace this with a streaming
//     WS endpoint; for now, the task is queued and the result is
//     fetched via a follow-up GET"
//   - adding a new migration is forbidden by the do-not-touch rule
//
// The store is intentionally small and synchronous to keep the surface
// easy to swap in D3. We do NOT call into the existing task worker
// (server/taskWorker.js / server/memory/tasks.js) because those
// tables have foreign keys to sub_agents(id), which doesn't apply to
// externally-published agent cards.

import crypto from 'crypto';
import { getAgentCard } from '../../agent-registry/factories.js';

// ─── In-memory task store ───────────────────────────────────────────────────
// Map<taskId, taskRecord>. taskRecord:
//   { taskId, cardId, callerId, ownerId, status, payload, options,
//     result, error, createdAt, updatedAt }
const tasks = new Map();

/**
 * Test-only escape hatch — clears the in-memory store. Exposed via the
 * router so tests can reset between cases without restarting the
 * process. Not part of the public API; no route maps to it.
 */
export function __resetTasksForTests() {
  tasks.clear();
}

/**
 * Test-only escape hatch — returns a shallow snapshot of the task
 * store. Useful for asserting queueing happened without exposing the
 * mutable Map directly.
 */
export function __listTasksForTests() {
  return Array.from(tasks.values()).map((t) => ({ ...t }));
}

function newTaskId() {
  return crypto.randomUUID();
}

/**
 * Determine if `actor` is allowed to invoke `card`. Visibility rules
 * mirror the read side: public → anyone authed; workspace → anyone
 * authed (out of scope to gate on workspace membership here);
 * private → owner only. For the REST endpoint we always require auth,
 * so actor is never null at this layer.
 */
function canInvoke(card, actor) {
  if (!card || !actor) return false;
  if (card.visibility === 'public') return true;
  if (card.visibility === 'workspace') return true;
  if (card.visibility === 'private') return card.owner_id === actor.id;
  return false;
}

/**
 * Determine if `actor` is allowed to read the result of `task`.
 * Both the caller (who invoked it) and the card's owner can read.
 */
function canReadTask(task, actor) {
  if (!task || !actor) return false;
  return task.callerId === actor.id || task.ownerId === actor.id;
}

// ─── CALL ────────────────────────────────────────────────────────────────────

export async function callCard(req, res) {
  try {
    const actor = req.agentActor;
    if (!actor) return res.status(401).json({ error: 'Authentication required' });

    const card = await getAgentCard(req.params.id);
    if (!card) return res.status(404).json({ error: 'Card not found' });
    if (!canInvoke(card, actor)) {
      // Don't reveal existence of private cards to non-owners.
      return res.status(404).json({ error: 'Card not found' });
    }

    const body = req.body || {};
    const taskId = newTaskId();
    const now = new Date().toISOString();
    const task = {
      taskId,
      cardId: card.id,
      callerId: actor.id,
      ownerId: card.owner_id,
      status: 'queued',
      payload: body.payload ?? null,
      options: body.options ?? null,
      result: null,
      error: null,
      createdAt: now,
      updatedAt: now,
    };
    tasks.set(taskId, task);

    res.status(202).json({ taskId, status: task.status });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// ─── READ RESULT ─────────────────────────────────────────────────────────────

export async function readCallResult(req, res) {
  try {
    const actor = req.agentActor;
    if (!actor) return res.status(401).json({ error: 'Authentication required' });

    const task = tasks.get(req.params.taskId);
    if (!task || task.cardId !== req.params.id) {
      return res.status(404).json({ error: 'Task not found' });
    }
    if (!canReadTask(task, actor)) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({
      taskId: task.taskId,
      cardId: task.cardId,
      status: task.status,
      result: task.result,
      error: task.error,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}