import express from 'express';
import pool from '../../db.js';
import {
  deleteUserState,
  deleteWorkspaceState,
  getUserState,
  getWorkspaceState,
  isSupportedClientStateKey,
  setUserState,
  setWorkspaceState,
  WORKSPACE_STATE_KEY,
} from '../../state/clientStateStore.js';
import { resolveWorkspaceContext } from '../../workspaces/context.js';

export const clientStateRouter = express.Router();

clientStateRouter.get('/client-state/:key', async (req, res) => {
  const key = req.params.key;
  if (!isSupportedClientStateKey(key)) return res.status(404).json({ error: 'Unknown state key' });

  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    if (key === WORKSPACE_STATE_KEY) {
      const workspace = await resolveWorkspaceContext(pool, {
        userId,
        workspaceId: req.query.workspaceId,
      });
      const state = await getWorkspaceState({ db: pool, workspaceId: workspace.id, key });
      if (!state.found) return res.status(404).json({ value: null, workspaceId: workspace.id });
      return res.json({ value: state.value, workspaceId: workspace.id });
    }
    const state = await getUserState({ db: pool, userId, key });
    if (!state.found) return res.status(404).json({ value: null });
    res.json({ value: state.value });
  } catch (err) {
    console.error('Failed to get client state:', err);
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

clientStateRouter.put('/client-state/:key', async (req, res) => {
  const key = req.params.key;
  if (!isSupportedClientStateKey(key)) return res.status(404).json({ error: 'Unknown state key' });

  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const nextValue = req.body?.value ?? null;

  try {
    if (key === WORKSPACE_STATE_KEY) {
      const workspace = await resolveWorkspaceContext(pool, {
        userId,
        workspaceId: req.body?.workspaceId || nextValue?.workspaceId,
        createIfMissing: true,
      });
      await setWorkspaceState({ db: pool, workspaceId: workspace.id, key, value: nextValue });
      return res.json({ ok: true, workspaceId: workspace.id });
    }
    await setUserState({ db: pool, userId, key, value: nextValue });
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to save client state:', err);
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

clientStateRouter.delete('/client-state/:key', async (req, res) => {
  const key = req.params.key;
  if (!isSupportedClientStateKey(key)) return res.status(404).json({ error: 'Unknown state key' });

  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    if (key === WORKSPACE_STATE_KEY) {
      const workspace = await resolveWorkspaceContext(pool, {
        userId,
        workspaceId: req.query.workspaceId,
      });
      await deleteWorkspaceState({ db: pool, workspaceId: workspace.id, key });
      return res.json({ ok: true, workspaceId: workspace.id });
    }
    await deleteUserState({ db: pool, userId, key });
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to delete client state:', err);
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});
