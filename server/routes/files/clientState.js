import express from 'express';
import pool from '../../db.js';
import {
  deleteUserState,
  getUserState,
  isSupportedClientStateKey,
  setUserState,
} from '../../state/clientStateStore.js';

export const clientStateRouter = express.Router();

clientStateRouter.get('/client-state/:key', async (req, res) => {
  const key = req.params.key;
  if (!isSupportedClientStateKey(key)) return res.status(404).json({ error: 'Unknown state key' });

  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const state = await getUserState({ db: pool, userId, key });
    if (!state.found) return res.status(404).json({ value: null });
    res.json({ value: state.value });
  } catch (err) {
    console.error('Failed to get client state:', err);
    res.status(500).json({ error: err.message });
  }
});

clientStateRouter.put('/client-state/:key', async (req, res) => {
  const key = req.params.key;
  if (!isSupportedClientStateKey(key)) return res.status(404).json({ error: 'Unknown state key' });

  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const nextValue = req.body?.value ?? null;

  try {
    await setUserState({ db: pool, userId, key, value: nextValue });
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to save client state:', err);
    res.status(500).json({ error: err.message });
  }
});

clientStateRouter.delete('/client-state/:key', async (req, res) => {
  const key = req.params.key;
  if (!isSupportedClientStateKey(key)) return res.status(404).json({ error: 'Unknown state key' });

  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    await deleteUserState({ db: pool, userId, key });
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to delete client state:', err);
    res.status(500).json({ error: err.message });
  }
});
