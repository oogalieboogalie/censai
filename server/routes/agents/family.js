import express from 'express';
import { requireDb } from './shared.js';
import {
  getConsciousness,
  updateConsciousness,
  addAssociation,
  getAssociations,
  entangleMemories,
  getEntanglements,
  getWatchGraph,
  addWatch,
  getGenetics,
  evolveTraits,
} from '../../memory.js';


export const familyRouter = express.Router();

familyRouter.get('/consciousness/:agentId', requireDb, async (req, res) => {
  try {
    const state = await getConsciousness(req.params.agentId);
    res.json(state || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

familyRouter.patch('/consciousness/:agentId', requireDb, async (req, res) => {
  try {
    await updateConsciousness(req.params.agentId, req.body);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

familyRouter.post('/api/associations', requireDb, async (req, res) => {
  // Let's also handle `/associations` cleanly
  try {
    const { agentId, conceptA, conceptB, strength, type } = req.body;
    if (!agentId || !conceptA || !conceptB) return res.status(400).json({ error: 'agentId, conceptA, conceptB required' });
    const id = await addAssociation(agentId, conceptA, conceptB, strength, type);
    res.json({ id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

familyRouter.post('/associations', requireDb, async (req, res) => {
  try {
    const { agentId, conceptA, conceptB, strength, type } = req.body;
    if (!agentId || !conceptA || !conceptB) return res.status(400).json({ error: 'agentId, conceptA, conceptB required' });
    const id = await addAssociation(agentId, conceptA, conceptB, strength, type);
    res.json({ id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

familyRouter.get('/associations/:agentId', requireDb, async (req, res) => {
  try {
    const associations = await getAssociations(req.params.agentId, req.query.concept || '', Number(req.query.limit) || 20);
    res.json(associations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

familyRouter.post('/entanglements', requireDb, async (req, res) => {
  try {
    const { agentId, memoryA, memoryB, correlation } = req.body;
    if (!agentId || !memoryA || !memoryB) return res.status(400).json({ error: 'agentId, memoryA, memoryB required' });
    const id = await entangleMemories(agentId, memoryA, memoryB, correlation);
    res.json({ id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

familyRouter.get('/entanglements/:agentId', requireDb, async (req, res) => {
  try {
    const results = await getEntanglements(req.params.agentId, req.query.memory || '');
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

familyRouter.get('/watch/:agentId', requireDb, async (req, res) => {
  try {
    const graph = await getWatchGraph(req.params.agentId);
    res.json(graph);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

familyRouter.post('/watch', requireDb, async (req, res) => {
  try {
    const { watcher, watching, relationship } = req.body;
    if (!watcher || !watching) return res.status(400).json({ error: 'watcher and watching required' });
    await addWatch(watcher, watching, relationship || 'general');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

familyRouter.get('/genetics/:agentId', requireDb, async (req, res) => {
  try {
    const genetics = await getGenetics(req.params.agentId);
    res.json(genetics || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

familyRouter.post('/genetics/:agentId/evolve', requireDb, async (req, res) => {
  try {
    const { traits, trigger } = req.body;
    if (!traits) return res.status(400).json({ error: 'traits required' });
    await evolveTraits(req.params.agentId, traits, trigger);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
