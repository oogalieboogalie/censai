import express from 'express';
import { requireDb } from './shared.js';
import {
  sendAgentMessage,
  getAgentMessages,
  markMessageRead,
} from '../../memory.js';


export const communicationRouter = express.Router();

communicationRouter.post('/messages', requireDb, async (req, res) => {
  try {
    const { fromAgent, toAgent, content, priority, threadId, subject, messageType } = req.body;
    if (!fromAgent || !content) return res.status(400).json({ error: 'fromAgent and content required' });
    const id = await sendAgentMessage(fromAgent, toAgent || null, content, { priority, threadId, subject, messageType });
    res.json({ id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

communicationRouter.get('/messages/:agentId', requireDb, async (req, res) => {
  try {
    const messages = await getAgentMessages(req.params.agentId, req.query.unread === 'true');
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

communicationRouter.patch('/messages/:id/read', requireDb, async (req, res) => {
  try {
    await markMessageRead(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
