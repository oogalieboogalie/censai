import pool from '../db.js';
import { parseScheduledTime } from './schedules_utils.js';

export async function createSchedule(s) {
  const nextRunAt = parseScheduledTime(s.scheduled_date, s.scheduled_time);

  const { rows } = await pool.query(
    `INSERT INTO schedules (
      agent_id, project_id, project_name, project_path, project_repo, project_ref,
      task_text, document_target, scheduled_time, scheduled_date,
      repeat_enabled, repeat_days, repeat_freq, status, next_run_at,
      github_url, github_number, last_error
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
    RETURNING *`,
    [
      s.agent_id, s.project_id || null, s.project_name, s.project_path || null,
      s.project_repo || null, s.project_ref || null, s.task_text,
      s.document_target || null, s.scheduled_time, s.scheduled_date,
      s.repeat_enabled || false, s.repeat_days || null, s.repeat_freq || null,
      s.status || 'active', nextRunAt,
      s.github_url || null, s.github_number || null, s.last_error || null
    ]
  );
  return rows[0];
}

export async function getSchedules() {
  const { rows } = await pool.query(`SELECT * FROM schedules ORDER BY next_run_at ASC`);
  return rows;
}

export async function updateSchedule(id, patch) {
  const fields = [];
  const values = [];
  let pi = 1;

  for (const [key, val] of Object.entries(patch)) {
    if ([
      'agent_id', 'project_id', 'project_name', 'project_path', 'project_repo',
      'project_ref', 'task_text', 'document_target', 'scheduled_time', 'scheduled_date',
      'repeat_enabled', 'repeat_days', 'repeat_freq', 'status', 'next_run_at',
      'github_url', 'github_number', 'last_error'
    ].includes(key)) {
      fields.push(`${key} = $${pi++}`);
      values.push(val);
    }
  }

  if (fields.length === 0) return null;

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const { rows } = await pool.query(
    `UPDATE schedules SET ${fields.join(', ')} WHERE id = $${pi} RETURNING *`,
    values
  );
  return rows[0];
}

export async function deleteSchedule(id) {
  await pool.query('DELETE FROM schedules WHERE id = $1', [id]);
}

export async function getDueSchedules() {
  const { rows } = await pool.query(
    `SELECT * FROM schedules
     WHERE status = 'active' AND next_run_at <= NOW()
     FOR UPDATE SKIP LOCKED`
  );
  return rows;
}

export async function claimNextDueSchedule() {
  const { rows } = await pool.query(
    `UPDATE schedules
     SET status = 'running', updated_at = NOW(), last_error = NULL
     WHERE id = (
       SELECT id FROM schedules
       WHERE status = 'active' AND next_run_at <= NOW()
       ORDER BY next_run_at ASC
       FOR UPDATE SKIP LOCKED
       LIMIT 1
     )
     RETURNING *`
  );
  return rows[0] || null;
}
