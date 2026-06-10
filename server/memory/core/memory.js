import pool from '../../db.js';
import { embed, embeddingsAvailable } from '../../embeddings.js';
import { upsertVector, searchVectors } from '../../qdrant.js';
import { randomUUID } from 'crypto';
import { storeHolographic } from '../persistence.js';
import { autoAssociate } from '../relations.js';
import { calculateImportance, calculateEmotionalWeight, quantumSignature } from '../scoring.js';
import { clampScore, normalizeSearchQuery, tokenizeSearchQuery, likePattern } from './shared.js';

export async function storeMemory(agentId, content, type = 'observation', opts = {}) {
  const memoryContent = typeof content === 'string' ? content.trim() : String(content || '').trim();
  if (!agentId) throw new Error('storeMemory requires an agentId');
  if (!memoryContent) throw new Error('storeMemory requires non-empty content');

  const importance = clampScore(opts.importance ?? calculateImportance(memoryContent, agentId), 0.5);
  const emotionalWeight = clampScore(opts.emotionalWeight ?? calculateEmotionalWeight(memoryContent), 0);
  const accessLevel = opts.accessLevel || 'private';
  const tags = opts.tags || [];
  const source = opts.source || null;
  const temporalAnchor = opts.temporalAnchor || null;
  const compressionSafe = opts.compressionSafe === true || importance >= 0.8 || emotionalWeight >= 0.7;
  const sig = quantumSignature(memoryContent);

  const { rows } = await pool.query(
    `INSERT INTO memories (agent_id, content, memory_type, importance, emotional_weight,
       access_level, tags, source, quantum_signature, temporal_anchor, compression_safe)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
    [agentId, memoryContent, type, importance, emotionalWeight, accessLevel, tags, source, sig, temporalAnchor, compressionSafe]
  );

  const memoryId = rows[0].id;

  try {
    const vector = await embed(memoryContent);
    if (vector) {
      const pointId = randomUUID();
      const upsertOk = await upsertVector(pointId, vector, {
        memory_id: memoryId, agent_id: agentId, memory_type: type,
        importance, emotional_weight: emotionalWeight, access_level: accessLevel,
        created_at: new Date().toISOString(),
      });
      if (upsertOk) {
        await pool.query('UPDATE memories SET embedding_id = $1 WHERE id = $2', [pointId, memoryId]);
      }
    }
  } catch (err) {
    console.warn('Memory vectorization skipped:', err.message);
  }

  if (compressionSafe) {
    try {
      await storeHolographic(memoryId, memoryContent);
    } catch (err) {
      console.warn('Holographic memory storage skipped:', err.message);
    }
  }

  try {
    await autoAssociate(agentId, memoryContent);
  } catch (err) {
    console.warn('Memory auto-association skipped:', err.message);
  }

  return memoryId;
}

export async function recallMemories(agentId, query, opts = {}) {
  const limit = Math.max(1, Number(opts.limit) || 10);
  const type = opts.type || null;
  const minImportance = opts.minImportance || 0;
  const includeShared = opts.includeShared !== false;
  const searchText = normalizeSearchQuery(query);
  const searchTerms = tokenizeSearchQuery(searchText);

  let semanticIds = new Set();
  let semanticScores = {};
  if (searchText && embeddingsAvailable()) {
    try {
      const vector = await embed(searchText, { inputType: 'search_query' });
      if (vector) {
        const filter = {
          should: [
            { key: 'agent_id', match: { value: agentId } },
            ...(includeShared ? [{ key: 'access_level', match: { value: 'shared' } }] : []),
          ],
        };
        if (type) filter.must = [{ key: 'memory_type', match: { value: type } }];

        const results = await searchVectors(vector, filter, limit);
        for (const r of results) {
          if (r.payload?.memory_id) {
            semanticIds.add(r.payload.memory_id);
            semanticScores[r.payload.memory_id] = r.score;
          }
        }
      }
    } catch (err) {
      console.warn('Semantic memory recall skipped:', err.message);
    }
  }

  let accessFilter = `(m.agent_id = $1`;
  if (includeShared) accessFilter += ` OR m.access_level = 'shared'`;
  accessFilter += `)`;

  const params = [agentId];
  let pi = 2;
  let lexicalScoreSql = '0';
  let lexicalWhereSql = '';
  const lexicalPredicates = [];
  const lexicalScoreParts = [];

  if (searchTerms.length > 0) {
    const phraseParam = `$${pi++}`;
    params.push(likePattern(searchText));
    lexicalPredicates.push(`m.content ILIKE ${phraseParam}`);
    lexicalScoreParts.push(`CASE WHEN m.content ILIKE ${phraseParam} THEN 0.45 ELSE 0 END`);

    for (const term of searchTerms) {
      const termParam = `$${pi++}`;
      params.push(likePattern(term));
      lexicalPredicates.push(`m.content ILIKE ${termParam}`);
      lexicalPredicates.push(`m.memory_type ILIKE ${termParam}`);
      lexicalPredicates.push(`COALESCE(m.source, '') ILIKE ${termParam}`);
      lexicalPredicates.push(`COALESCE(array_to_string(m.tags, ' '), '') ILIKE ${termParam}`);
      lexicalScoreParts.push(`CASE WHEN m.content ILIKE ${termParam} THEN 0.18 ELSE 0 END`);
      lexicalScoreParts.push(`CASE WHEN m.memory_type ILIKE ${termParam} THEN 0.05 ELSE 0 END`);
      lexicalScoreParts.push(`CASE WHEN COALESCE(m.source, '') ILIKE ${termParam} THEN 0.04 ELSE 0 END`);
      lexicalScoreParts.push(`CASE WHEN COALESCE(array_to_string(m.tags, ' '), '') ILIKE ${termParam} THEN 0.04 ELSE 0 END`);
    }
    lexicalWhereSql = ` AND (${lexicalPredicates.join(' OR ')})`;
    lexicalScoreSql = lexicalScoreParts.join(' + ');
  }

  let sql = `SELECT id, content, memory_type, importance, emotional_weight, tags, created_at, entangled_with,
                    (${lexicalScoreSql}) AS lexical_score
             FROM memories m WHERE ${accessFilter}`;
  sql += lexicalWhereSql;

  if (type) { sql += ` AND memory_type = $${pi++}`; params.push(type); }
  if (minImportance > 0) { sql += ` AND importance >= $${pi++}`; params.push(minImportance); }

  sql += ` ORDER BY (${lexicalScoreSql}) DESC, (importance * 0.6 + emotional_weight * 0.4) DESC, created_at DESC LIMIT $${pi}`;
  params.push(limit * 2);
  const { rows: dbResults } = await pool.query(sql, params);

  if (dbResults.length > 0) {
    Promise.resolve(pool.query(
      'UPDATE memories SET last_accessed = NOW(), access_count = access_count + 1 WHERE id = ANY($1)',
      [dbResults.map(r => r.id)]
    )).catch(() => {});
  }

  const seen = new Map();
  for (const r of dbResults) {
    const combined = (Number(r.importance || 0) * 0.35)
      + (Number(r.emotional_weight || 0) * 0.2)
      + (Number(r.lexical_score || 0) * 0.25)
      + ((semanticScores[r.id] || 0) * 0.2);
    seen.set(r.id, { ...r, combined_score: combined });
  }

  const missingIds = [...semanticIds].filter(id => !seen.has(id));
  if (missingIds.length > 0) {
    const { rows } = await pool.query(
      'SELECT id, content, memory_type, importance, emotional_weight, tags, created_at FROM memories WHERE id = ANY($1)',
      [missingIds]
    );
    for (const r of rows) {
      const combined = (Number(r.importance || 0) * 0.35)
        + (Number(r.emotional_weight || 0) * 0.2)
        + ((semanticScores[r.id] || 0) * 0.45);
      seen.set(r.id, { ...r, combined_score: combined });
    }
  }

  return [...seen.values()]
    .sort((a, b) => b.combined_score - a.combined_score)
    .slice(0, limit);
}
