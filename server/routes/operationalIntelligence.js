import express from 'express';
import { actorFromRequest } from '../context/actorContext.js';
import { workspaceContextFromRequest } from '../context/requestContext.js';
import pool from '../db.js';
import { requireFeatureFlag } from '../middleware/runtimeMode.js';
import { createHandoff, loadArtifactCausality } from '../operational-intelligence/handoffs.js';
import { safeFastForwardCurrentProject, syncPulledTodoArtifacts } from '../operational-intelligence/localPull.js';
import { dispatchTodoItem } from '../operational-intelligence/todoDispatch.js';
import { createTodoItem, loadItems, openTodoList, updateTodoItem } from '../operational-intelligence/todos.js';
import { resolveArtifact, createArtifact } from '../operational-intelligence/factories.js';

export const operationalIntelligenceRouter = express.Router();

operationalIntelligenceRouter.use(requireFeatureFlag('operational-intelligence'));

operationalIntelligenceRouter.get('/todos/:listId', async (req, res) => {
  try {
    actorFromRequest(req);
    const { workspaceId } = workspaceContextFromRequest(req);
    const list = await requireWorkspaceArtifact(req.params.listId, workspaceId, 'List');
    if (!list || list.artifact_type !== 'task_list') return res.status(404).json({ error: 'List not found' });
    const items = await loadItems(pool, workspaceId, list.id);
    res.json(toTodoPayload({ list, items }));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

operationalIntelligenceRouter.get('/events', async (req, res) => {
  try {
    const { type, limit = 50 } = req.query;
    let query = 'SELECT * FROM workspace_events';
    const params = [];
    if (type) {
      query += ' WHERE event_type = $1';
      params.push(type);
    }
    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1);
    params.push(limit);
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * Telemetry endpoint for runtime provenance validation.
 * Used by the Python SDK reference implementation.
 */
operationalIntelligenceRouter.post('/telemetry/provenance', async (req, res) => {
  try {
    const { workspace_id, event_type, ...payload } = req.body;

    // We record this as a workspace event, potentially linking to an
    // ai_provenance artifact if the file_path matches.
    const artifactQuery = `
      SELECT id FROM artifacts
      WHERE workspace_id = $1
        AND artifact_type = 'ai_provenance'
        AND data->>'file_path' = $2
      ORDER BY created_at DESC LIMIT 1
    `;
    const artRes = await pool.query(artifactQuery, [workspace_id, payload.file_path]);
    const artifactId = artRes.rows[0]?.id || null;

    const eventQuery = `
      INSERT INTO workspace_events (
        workspace_id,
        event_type,
        actor_kind,
        actor_id,
        artifact_id,
        payload
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;

    const eventRes = await pool.query(eventQuery, [
      workspace_id,
      event_type || 'runtime_validation',
      'system',
      'python_sdk',
      artifactId,
      payload
    ]);

    res.status(201).json({ id: eventRes.rows[0].id, linkedArtifact: artifactId });
  } catch (err) {
    // We don't want telemetry failures to crash anything, but we log for dev
    console.error('[Telemetry] Provenance error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

operationalIntelligenceRouter.post('/todos/open', async (req, res) => {
  try {
    const actor = actorFromRequest(req);
    const { workspaceId } = workspaceContextFromRequest(req);
    const result = await openTodoList(pool, { ...(req.body || {}), workspaceId, actor });
    res.json(toTodoPayload(result));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

operationalIntelligenceRouter.post('/todos/:listId/items', async (req, res) => {
  try {
    const actor = actorFromRequest(req);
    const { workspaceId } = workspaceContextFromRequest(req);
    await requireWorkspaceArtifact(req.params.listId, workspaceId, 'To-do list artifact');
    const result = await createTodoItem(pool, {
      ...(req.body || {}),
      workspaceId,
      actor,
      listArtifactId: req.params.listId,
    });
    res.json(toTodoPayload(result));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

operationalIntelligenceRouter.patch('/todos/:listId/items/:itemId', async (req, res) => {
  try {
    const actor = actorFromRequest(req);
    const { workspaceId } = workspaceContextFromRequest(req);
    await requireWorkspaceArtifact(req.params.listId, workspaceId, 'To-do list artifact');
    const result = await updateTodoItem(pool, {
      ...(req.body || {}),
      workspaceId,
      actor,
      listArtifactId: req.params.listId,
      itemArtifactId: req.params.itemId,
    });
    res.json(toTodoPayload(result));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

operationalIntelligenceRouter.post('/todos/:listId/items/:itemId/dispatch', async (req, res) => {
  try {
    const actor = actorFromRequest(req);
    const { workspaceId } = workspaceContextFromRequest(req);
    await requireWorkspaceArtifact(req.params.listId, workspaceId, 'To-do list artifact');
    const result = await dispatchTodoItem(pool, {
      ...(req.body || {}),
      workspaceId,
      actor,
      listArtifactId: req.params.listId,
      itemArtifactId: req.params.itemId,
    });
    res.json({ ...toTodoPayload(result), dispatch: result.dispatch });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

operationalIntelligenceRouter.get('/traces', async (req, res) => {
  try {
    const { workspaceId = 'default', limit = 50 } = req.query;
    const { rows } = await pool.query(
      `SELECT * FROM artifacts
       WHERE workspace_id = $1 AND artifact_type = 'agent_session_trace'
       ORDER BY created_at DESC LIMIT $2`,
      [workspaceId, limit]
    );
    res.json(rows);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

operationalIntelligenceRouter.get('/traces/:id/events', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM workspace_events
       WHERE artifact_id = $1
       ORDER BY created_at ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

operationalIntelligenceRouter.post('/traces/:id/convert-to-test', async (req, res) => {
  try {
    const trace = await resolveArtifact({ db: pool }, { artifactId: req.params.id });
    if (!trace) return res.status(404).json({ error: 'Trace not found' });

    const { rows: events } = await pool.query(
      `SELECT * FROM workspace_events WHERE artifact_id = $1 ORDER BY created_at ASC`,
      [trace.id]
    );

    const testCase = await createArtifact({ db: pool }, {
      workspaceId: trace.workspace_id,
      type: 'regression_test_case',
      title: `Regression Test: ${trace.title}`,
      owner: { kind: 'system', id: 'observability' },
      data: {
        traceId: trace.id,
        initialContext: trace.data.initialContext,
        events: events.map(e => ({ type: e.event_type, payload: e.payload })),
        finalText: trace.data.finalTextPreview,
      },
      metadata: {
        convertedFrom: trace.id,
      },
    });

    res.json(testCase);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

operationalIntelligenceRouter.post('/handoffs', async (req, res) => {
  try {
    const actor = actorFromRequest(req);
    const { workspaceId } = workspaceContextFromRequest(req);
    const result = await createHandoff({ db: pool }, { ...(req.body || {}), workspaceId, owner: actor });
    const causality = await loadArtifactCausality({ db: pool }, {
      workspaceId: result.handoff.workspace_id,
      artifactId: result.handoff.id,
      limit: req.body?.limit,
    });
    res.json({
      handoff: causality.artifact,
      upstream: causality.upstream,
      downstream: causality.downstream,
      events: [result.event],
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

operationalIntelligenceRouter.get('/artifacts/:artifactId/causality', async (req, res) => {
  try {
    actorFromRequest(req);
    const { workspaceId } = workspaceContextFromRequest(req);
    const result = await loadArtifactCausality({ db: pool }, {
      workspaceId,
      artifactId: req.params.artifactId,
      limit: req.query.limit,
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

operationalIntelligenceRouter.post('/sync/pull-merged', async (req, res) => {
  try {
    const pull = await safeFastForwardCurrentProject(req.body || {});
    const updatedArtifacts = await syncPulledTodoArtifacts(pool, pull);
    res.json({
      pull,
      updatedTodoCount: updatedArtifacts.length,
      updatedTodos: updatedArtifacts.map(row => ({ id: row.id, ...(row.data || {}) })),
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

function toTodoPayload({ list, items }) {
  return {
    artifactId: list.id,
    title: list.title,
    items,
  };
}

async function requireWorkspaceArtifact(artifactId, workspaceId, label) {
  const artifact = await resolveArtifact({ db: pool }, { artifactId });
  if (!artifact) throw new Error(`${label} not found`);
  if (artifact.workspace_id !== workspaceId) {
    throw new Error('Cross-workspace references are not allowed');
  }
  return artifact;
}
