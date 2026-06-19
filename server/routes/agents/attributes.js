import express from 'express';
import { requireDb } from './shared.js';
import pool from '../../db.js';

export const attributesRouter = express.Router();

/**
 * @route GET /api/attributes
 * @returns {object} List of all available trait definitions.
 */
attributesRouter.get('/attributes', requireDb, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, name, description, value FROM attributes ORDER BY name');
    res.json({ attributes: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route GET /api/agents/:id/attributes
 * @returns {object} Array of equipped attribute IDs.
 */
attributesRouter.get('/agents/:id/attributes', requireDb, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT attribute_id FROM agent_attributes WHERE agent_id = $1',
      [req.params.id]
    );
    res.json({ attributes: rows.map(r => r.attribute_id) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @route PUT /api/agents/:id/attributes
 * @param {object} req.body Equipped attribute IDs payload.
 * @returns {object} Status indicating success.
 */
attributesRouter.put('/agents/:id/attributes', requireDb, async (req, res) => {
  const agentId = req.params.id;
  const attributeIds = req.body?.attributes || [];
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Clear existing attributes
    await client.query('DELETE FROM agent_attributes WHERE agent_id = $1', [agentId]);
    
    // Insert new associations
    for (const attrId of attributeIds) {
      await client.query(
        'INSERT INTO agent_attributes (agent_id, attribute_id) VALUES ($1, $2)',
        [agentId, attrId]
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
 * @route POST /api/agents/:id/compile-prompt-preview
 * @param {object} req.body Template string and active attributes.
 * @returns {object} The compiled template.
 */
attributesRouter.post('/agents/:id/compile-prompt-preview', requireDb, async (req, res) => {
  try {
    const { compilePromptTemplate } = await import('../../memory/promptCompiler.js');
    const template = req.body?.template || '';
    const attributeIds = req.body?.attributes || [];
    
    // Fetch values for those attributes
    let attrMap = {};
    if (attributeIds.length > 0) {
      const { rows } = await pool.query(
        'SELECT id, value FROM attributes WHERE id = ANY($1)',
        [attributeIds]
      );
      rows.forEach(r => {
        attrMap[r.id] = r.value;
      });
    }
    
    const compiled = compilePromptTemplate(template, attrMap);
    res.json({ compiled });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
