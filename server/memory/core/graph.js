import pool from '../../db.js';

export async function addTriple(agentId, subject, predicate, object, confidence = 1.0) {
  const { rows } = await pool.query(
    `INSERT INTO knowledge_graph (agent_id, subject, predicate, object, confidence)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [agentId, subject, predicate, object, confidence]
  );
  return rows[0].id;
}

export async function queryGraph(agentId, subject) {
  const { rows } = await pool.query(
    `SELECT subject, predicate, object, confidence FROM knowledge_graph
     WHERE agent_id = $1 AND (subject = $2 OR object = $2)
     ORDER BY confidence DESC`,
    [agentId, subject]
  );
  return rows;
}
