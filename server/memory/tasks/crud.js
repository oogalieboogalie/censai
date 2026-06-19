import pool from '../../db.js';
import { TERMINAL_TASK_STATUSES, buildCompletionReceipt } from './receipts.js';

export async function createAgentTask(task) {
  const { parentId, assigneeId, projectId, project, title, prompt, priority, batchId, batchLabel, wakeId } = task;
  const { rows } = await pool.query(
    `INSERT INTO agent_tasks (parent_id, assignee_id, project_id, project, title, prompt, priority, batch_id, batch_label, wake_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [parentId, assigneeId, projectId, project, title, prompt, priority || 'normal',
     batchId || null, batchLabel || null, wakeId || null]
  );
  return rows[0];
}

export async function getAgentTasks(projectId = null, opts = {}) {
  const where = [];
  const values = [];
  let pi = 1;

  if (projectId) {
    where.push(`at.project_id = $${pi++}`);
    values.push(projectId);
  }

  if (opts.status) {
    where.push(`at.status = $${pi++}`);
    values.push(opts.status);
  }

  const limit = Math.max(1, Math.min(Number(opts.limit) || 100, 500));
  values.push(limit);

  const { rows } = await pool.query(
    `SELECT at.*,
            js.jules_session_name,
            js.status AS jules_status,
            js.pr_number AS jules_pr_number,
            js.pr_url AS jules_pr_url,
            js.pr_state AS jules_pr_state,
            js.review_state AS jules_review_state,
            js.review_author AS jules_review_author,
            js.pr_merged_at AS jules_pr_merged_at
     FROM agent_tasks at
     LEFT JOIN jules_sessions js ON js.agent_task_id = at.id
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY COALESCE(at.completed_at, at.updated_at, at.created_at) DESC
     LIMIT $${pi}`,
    values
  );
  return rows;
}

export async function getAgentTask(id) {
  const { rows } = await pool.query(
    'SELECT * FROM agent_tasks WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

export async function claimNextQueuedAgentTask() {
  const { rows } = await pool.query(
    `UPDATE agent_tasks
     SET status = 'in_progress', started_at = NOW(), updated_at = NOW()
     WHERE id = (
       SELECT id FROM agent_tasks
       WHERE status = 'queued'
       ORDER BY priority DESC, created_at ASC
       FOR UPDATE SKIP LOCKED
       LIMIT 1
     )
     RETURNING *`
  );
  return rows[0] || null;
}

export async function requeueInProgressAgentTasks() {
  await pool.query(
    `UPDATE agent_tasks
     SET status = 'queued', updated_at = NOW(), started_at = NULL
     WHERE status = 'in_progress'`
  );
}

export async function updateAgentTask(id, patch) {
  const current = TERMINAL_TASK_STATUSES.has(patch.status)
    ? await getAgentTask(id)
    : null;
  const fields = [];
  const values = [];
  let pi = 1;
  for (const [key, val] of Object.entries(patch)) {
    if (['status', 'result', 'error', 'completion_receipt'].includes(key)) {
      fields.push(`${key} = $${pi++}`);
      values.push(val);
    }
  }
  if (fields.length === 0) return null;
  fields.push(`updated_at = NOW()`);

  if (patch.status && ['completed', 'failed', 'cancelled'].includes(patch.status)) {
    fields.push(`completed_at = NOW()`);
    if (!Object.prototype.hasOwnProperty.call(patch, 'completion_receipt')) {
      fields.push(`completion_receipt = $${pi++}`);
      values.push(buildCompletionReceipt(current || { id }, patch));
    }
  }

  values.push(id);
  const { rows } = await pool.query(
    `UPDATE agent_tasks SET ${fields.join(', ')} WHERE id = $${pi} RETURNING *`,
    values
  );
  return rows[0];
}
