import express from 'express';
import { actorFromRequest } from '../context/actorContext.js';
import { workspaceContextFromRequest } from '../context/requestContext.js';
import pool from '../db.js';
import { registerModelDeployment, ingestTelemetry, triggerRetraining } from '../operational-intelligence/mlops.js';
import { resolveArtifact } from '../operational-intelligence/factories.js';
import { resourceRateLimiter } from '../middleware/standardRateLimits.js';

export const mlopsRouter = express.Router();
mlopsRouter.use(resourceRateLimiter);

mlopsRouter.post('/models', async (req, res) => {
  try {
    const actor = actorFromRequest(req);
    const { workspaceId } = workspaceContextFromRequest(req);
    const result = await registerModelDeployment({ db: pool }, {
      ...req.body,
      workspaceId,
      owner: actor,
    });
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

mlopsRouter.post('/models/:id/retrain', async (req, res) => {
  try {
    const actor = actorFromRequest(req);
    const { workspaceId } = workspaceContextFromRequest(req);
    const result = await triggerRetraining({ db: pool }, {
      workspaceId,
      deploymentId: req.params.id,
      reason: req.body.reason,
      actor,
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

mlopsRouter.get('/models', async (req, res) => {
  try {
    const { workspaceId } = workspaceContextFromRequest(req);
    const { rows } = await pool.query(
      `SELECT * FROM artifacts
       WHERE workspace_id = $1 AND artifact_type = 'ml_model_deployment' AND deleted_at IS NULL
       ORDER BY updated_at DESC`,
      [workspaceId]
    );
    res.json(rows);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

mlopsRouter.get('/models/:id', async (req, res) => {
  try {
    const { workspaceId } = workspaceContextFromRequest(req);
    const artifact = await resolveArtifact({ db: pool }, { artifactId: req.params.id });
    if (!artifact || artifact.workspace_id !== workspaceId || artifact.artifact_type !== 'ml_model_deployment') {
      return res.status(404).json({ error: 'Model deployment not found' });
    }
    res.json(artifact);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

mlopsRouter.post('/telemetry', async (req, res) => {
  try {
    const { workspaceId } = workspaceContextFromRequest(req);
    const { deploymentId, features } = req.body;
    const result = await ingestTelemetry({ db: pool }, {
      workspaceId,
      deploymentId,
      features,
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

mlopsRouter.get('/models/:id/alerts', async (req, res) => {
  try {
    const { workspaceId } = workspaceContextFromRequest(req);
    const { rows } = await pool.query(
      `SELECT * FROM artifacts
       WHERE workspace_id = $1 AND artifact_type = 'ml_drift_alert'
         AND data->>'deploymentId' = $2 AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [workspaceId, req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
