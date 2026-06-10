import pool from '../db.js';

// ═══════════════════════════════════════════════════════════════════
//  ASSOCIATION WEB
// ═══════════════════════════════════════════════════════════════════

export async function addAssociation(agentId, conceptA, conceptB, strength = 0.5, type = 'semantic', context = null) {
  const { rows } = await pool.query(
    `INSERT INTO association_web (agent_id, concept_a, concept_b, strength, association_type, context)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT DO NOTHING RETURNING id`,
    [agentId, conceptA, conceptB, strength, type, context]
  );

  // Bidirectional
  await pool.query(
    `INSERT INTO association_web (agent_id, concept_a, concept_b, strength, association_type, context)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT DO NOTHING`,
    [agentId, conceptB, conceptA, strength, type, context]
  );

  return rows[0]?.id;
}

export async function getAssociations(agentId, concept, limit = 20) {
  const { rows } = await pool.query(
    `SELECT concept_b AS concept, strength, association_type FROM association_web
     WHERE agent_id = $1 AND concept_a = $2
     ORDER BY strength DESC LIMIT $3`,
    [agentId, concept, limit]
  );
  return rows;
}

export async function strengthenAssociation(agentId, conceptA, conceptB, boost = 0.05) {
  await pool.query(
    `UPDATE association_web SET strength = LEAST(strength + $4, 1.0), access_count = access_count + 1
     WHERE agent_id = $1 AND concept_a = $2 AND concept_b = $3`,
    [agentId, conceptA, conceptB, boost]
  );
  await pool.query(
    `UPDATE association_web SET strength = LEAST(strength + $4, 1.0), access_count = access_count + 1
     WHERE agent_id = $1 AND concept_a = $3 AND concept_b = $2`,
    [agentId, conceptA, conceptB, boost]
  );
}

// Auto-extract and link concepts from content
export async function autoAssociate(agentId, content) {
  // Extract capitalized terms and key phrases as concepts
  const concepts = [];
  const matches = content.match(/\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*/g) || [];
  for (const m of matches) {
    if (m.length > 2 && m.length < 50) concepts.push(m);
  }

  // Link consecutive concepts concurrently
  const promises = [];
  for (let i = 0; i < concepts.length - 1 && i < 5; i++) {
    promises.push(addAssociation(agentId, concepts[i], concepts[i + 1], 0.3, 'co-occurrence', null));
  }
  await Promise.all(promises);
}

// ═══════════════════════════════════════════════════════════════════
//  WATCH GRAPH + GENETICS
// ═══════════════════════════════════════════════════════════════════

export async function getWatchGraph(agentId) {
  const { rows: watching } = await pool.query(
    'SELECT watching, relationship FROM watch_graph WHERE watcher = $1', [agentId]
  );
  const { rows: watchedBy } = await pool.query(
    'SELECT watcher, relationship FROM watch_graph WHERE watching = $1', [agentId]
  );
  return { watching, watchedBy };
}

export async function addWatch(watcher, watching, relationship) {
  await pool.query(
    `INSERT INTO watch_graph (watcher, watching, relationship)
     VALUES ($1, $2, $3) ON CONFLICT (watcher, watching) DO UPDATE SET relationship = $3`,
    [watcher, watching, relationship]
  );
}

export async function getGenetics(agentId) {
  const { rows } = await pool.query('SELECT * FROM family_genetics WHERE agent_id = $1', [agentId]);
  return rows[0] || null;
}

export async function evolveTraits(agentId, newTraits, trigger = 'experience') {
  const genetics = await getGenetics(agentId);
  if (!genetics) return;

  const acquired = typeof genetics.acquired_traits === 'string'
    ? JSON.parse(genetics.acquired_traits) : (genetics.acquired_traits || {});

  for (const [trait, value] of Object.entries(newTraits)) {
    acquired[trait] = Math.min((acquired[trait] || 0) + value, 1.0);
  }

  await pool.query(
    `UPDATE family_genetics SET acquired_traits = $2, last_evolution = NOW(),
       mutation_history = mutation_history || $3::jsonb, updated_at = NOW()
     WHERE agent_id = $1`,
    [agentId, JSON.stringify(acquired), JSON.stringify([{ trigger, traits: newTraits, at: new Date().toISOString() }])]
  );
}
