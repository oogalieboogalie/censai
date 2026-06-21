import express from 'express';
import pool from '../db.js';
import { prioritizeArtifacts } from '../operational-intelligence/prioritization.js';
import { ensureOperationalIntelligenceSchema } from '../operational-intelligence/schema.js';

export const contextRouter = express.Router();

/**
 * GET /api/context/feed
 * Returns a prioritized list of recent notifications and tasks.
 */
contextRouter.get('/context/feed', async (req, res) => {
  const { workspaceId, limit = 50 } = req.query;
  if (!workspaceId) return res.status(400).json({ error: 'workspaceId is required' });

  try {
    // skip schema check in tests if DB is mocked
    if (process.env.NODE_ENV !== 'test') {
      await ensureOperationalIntelligenceSchema(pool);
    }

    // Fetch recent external artifacts
    const { rows: artifacts } = await pool.query(
      `SELECT * FROM artifacts
       WHERE workspace_id = $1
         AND artifact_type IN ('notification', 'external_task', 'external_message', 'task')
         AND status = 'active'
       ORDER BY updated_at DESC LIMIT $2`,
      [workspaceId, limit]
    );

    const prioritized = await prioritizeArtifacts(artifacts, { workspaceId });
    res.json(prioritized);
  } catch (err) {
    console.error('Feed error:', err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

/**
 * GET /api/context/search
 * Cross-platform search across all artifacts.
 */
contextRouter.get('/context/search', async (req, res) => {
  const { workspaceId, q, limit = 20 } = req.query;
  if (!workspaceId || !q) return res.status(400).json({ error: 'workspaceId and query (q) are required' });

  try {
    if (process.env.NODE_ENV !== 'test') {
      await ensureOperationalIntelligenceSchema(pool);
    }

    const { rows: results } = await pool.query(
      `SELECT *, ts_rank_cd(to_tsvector('english', title || ' ' || data::text), plainto_tsquery('english', $2)) as rank
       FROM artifacts
       WHERE workspace_id = $1
         AND (title ILIKE $3 OR data::text ILIKE $3)
         AND status = 'active'
       ORDER BY rank DESC, updated_at DESC
       LIMIT $4`,
      [workspaceId, q, `%${q}%`, limit]
    );

    res.json(results);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});
