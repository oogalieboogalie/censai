import express from 'express';
import { requireDb } from './shared.js';
import {
  getAllSubAgents,
  getSubAgents,
  createSubAgent,
  updateSubAgent,
  deleteSubAgent,
  scratchpadRead,
  scratchpadWrite,
  scratchpadClear,
} from '../../memory.js';


export const subagentsRouter = express.Router();

subagentsRouter.get('/sub-agents', requireDb, async (req, res) => {
  try {
    const subs = await getAllSubAgents();
    res.json(subs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

subagentsRouter.get('/sub-agents/:parentId', requireDb, async (req, res) => {
  try {
    const subs = await getSubAgents(req.params.parentId);
    res.json(subs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

subagentsRouter.post('/sub-agents', requireDb, async (req, res) => {
  try {
    const { parentId, name, role, specialty, systemPrompt, hue, permission, projectId, modelProvider, modelName, model_provider, model_name, toolScopes, tool_scopes } = req.body;
    if (!parentId || !name) return res.status(400).json({ error: 'parentId and name required' });
    const sub = await createSubAgent(parentId, {
      name,
      role,
      specialty,
      systemPrompt,
      hue,
      permission,
      projectId,
      modelProvider: modelProvider || model_provider,
      modelName: modelName || model_name,
      toolScopes,
      tool_scopes,
    });
    res.json(sub);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

subagentsRouter.put('/sub-agents/:id', requireDb, async (req, res) => {
  try {
    const sub = await updateSubAgent(req.params.id, req.body);
    if (!sub) return res.status(404).json({ error: 'Sub-agent not found' });
    res.json(sub);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

subagentsRouter.delete('/sub-agents/:id', requireDb, async (req, res) => {
  try {
    await deleteSubAgent(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

subagentsRouter.get('/scratchpad/:subAgentId/:project', requireDb, async (req, res) => {
  try {
    const data = await scratchpadRead(req.params.subAgentId, req.params.project, req.query.key);
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

subagentsRouter.post('/scratchpad/:subAgentId/:project', requireDb, async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key) return res.status(400).json({ error: 'key required' });
    const entry = await scratchpadWrite(req.params.subAgentId, req.params.project, key, value);
    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

subagentsRouter.delete('/scratchpad/:subAgentId/:project', requireDb, async (req, res) => {
  try {
    const count = await scratchpadClear(req.params.subAgentId, req.params.project);
    res.json({ cleared: count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
