import express from 'express';
import { actorFromRequest } from '../context/actorContext.js';
import { workspaceContextFromRequest } from '../context/requestContext.js';
import pool from '../db.js';
import { requireFeatureFlag } from '../middleware/runtimeMode.js';
import { createHandoff, loadArtifactCausality } from '../operational-intelligence/handoffs.js';
import { safeFastForwardCurrentProject, syncPulledTodoArtifacts } from '../operational-intelligence/localPull.js';
import { dispatchTodoItem } from '../operational-intelligence/todoDispatch.js';
import { createTodoItem, loadItems, openTodoList, updateTodoItem } from '../operational-intelligence/todos.js';
import { resolveArtifact } from '../operational-intelligence/factories.js';

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
