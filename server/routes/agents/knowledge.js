import express from 'express';
import { requireDb } from './shared.js';
import {
  addTriple,
  queryGraph,
  addNugget,
  getNuggets,
} from '../../memory.js';


export const knowledgeRouter = express.Router();

knowledgeRouter.post('/graph', requireDb, async (req, res) => {
  try {
    const { agentId, subject, predicate, object, confidence } = req.body;
    if (!agentId || !subject || !predicate || !object) {
      return res.status(400).json({ error: 'agentId, subject, predicate, object required' });
    }
    const id = await addTriple(agentId, subject, predicate, object, confidence);
    res.json({ id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

knowledgeRouter.get('/graph/:agentId', requireDb, async (req, res) => {
  try {
    const triples = await queryGraph(req.params.agentId, req.query.subject || '');
    res.json(triples);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

knowledgeRouter.post('/nuggets', requireDb, async (req, res) => {
  try {
    const { title, content, discoveredBy, qualityScore } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'title and content required' });
    const id = await addNugget(title, content, discoveredBy, qualityScore);
    res.json({ id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

knowledgeRouter.get('/nuggets/:agentId', requireDb, async (req, res) => {
  try {
    const nuggets = await getNuggets(req.params.agentId, Number(req.query.limit) || 10);
    res.json(nuggets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
