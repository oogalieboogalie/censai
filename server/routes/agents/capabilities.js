import express from 'express';
import { requireDb } from './shared.js';
import pool from '../../db.js';
import { filterToolsForAgent } from '../../tools.js';

export const capabilitiesRouter = express.Router();

/**
 * @route GET /api/agents/:id/capabilities
 * @returns {object} Capability records for the requested agent ID.
 */
capabilitiesRouter.get('/agents/:id/capabilities', requireDb, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT capability_id, mode, scope_type, scope_id, source, equipped_slot FROM agent_capabilities WHERE agent_id = $1',
      [req.params.id]
    );
    res.json({ capabilities: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route PUT /api/agents/:id/capabilities
 * @param {object} req.body Capabilities payload to set.
 * @returns {object} Status indicating success.
 */
capabilitiesRouter.put('/agents/:id/capabilities', requireDb, async (req, res) => {
  const agentId = req.params.id;
  const capabilities = req.body?.capabilities || [];
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Clear existing capabilities for this agent
    await client.query('DELETE FROM agent_capabilities WHERE agent_id = $1', [agentId]);
    
    // Insert new capabilities
    for (const cap of capabilities) {
      const mode = cap.mode || 'read';
      const scopeType = cap.scope_type || 'workspace';
      const scopeId = cap.scope_id || '';
      const source = cap.source || 'manual';
      const slot = cap.equipped_slot || null;
      
      await client.query(
        `INSERT INTO agent_capabilities (agent_id, capability_id, mode, scope_type, scope_id, source, equipped_slot)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [agentId, cap.capability_id, mode, scopeType, scopeId, source, slot]
      );
    }
    
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

/**
 * @route GET /api/agents/:id/debug-tools
 * @returns {object} List of tool names allowed for the agent.
 */
capabilitiesRouter.get('/agents/:id/debug-tools', requireDb, async (req, res) => {
  try {
    const tools = await filterToolsForAgent(req.params.id);
    res.json({ tools: tools.map(t => t.function.name) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
