import pool from '../db.js';

// ═══════════════════════════════════════════════════════════════════
//  SUB-AGENTS
// ═══════════════════════════════════════════════════════════════════

const SUB_AGENT_PRESETS = {
  refactorer: {
    role: 'Specialized Refactoring Specialist designed to break down monolithic files into AI-digestible modules.',
    specialty: 'Modularization, code division, single responsibility division.',
    permission: 'worker'
  },
  scout: {
    role: 'Nano-Scout designed to survey codebase structures, maps, and outline files quickly.',
    specialty: 'Fast directory surveying, file mapping, file outline surveying.',
    permission: 'researcher'
  },
  coder: {
    role: 'Feature Developer designed to surgically implement code changes and write tests.',
    specialty: 'Surgical coding, test cases, styles, backward-compatibility.',
    permission: 'worker'
  },
  reviewer: {
    role: 'PR Auditor designed to locate bugs, security flaws, and performance issues.',
    specialty: 'Security auditing, quality checks, review comments.',
    permission: 'reviewer'
  }
};

export async function createSubAgent(parentId, { name, role, specialty, systemPrompt, hue, permission, projectId, modelProvider, modelName, preset, class: agentClass, reviewSpecialty, systemPromptInject, toolScopes, tool_scopes }) {
  if (preset && SUB_AGENT_PRESETS[preset.toLowerCase()]) {
    const config = SUB_AGENT_PRESETS[preset.toLowerCase()];
    role = role || config.role;
    specialty = specialty || config.specialty;
    permission = permission || config.permission;
  }

  const scopes = tool_scopes ?? toolScopes ?? {};
  const id = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + parentId;
  const { rows } = await pool.query(
    `INSERT INTO sub_agents (id, parent_id, name, role, specialty, system_prompt, hue, permission, project_id, model_provider, model_name, class, review_specialty, system_prompt_inject, tool_scopes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name, role = EXCLUDED.role, specialty = EXCLUDED.specialty,
       system_prompt = EXCLUDED.system_prompt, hue = EXCLUDED.hue,
       permission = EXCLUDED.permission, project_id = EXCLUDED.project_id,
       model_provider = EXCLUDED.model_provider, model_name = EXCLUDED.model_name,
       class = EXCLUDED.class, review_specialty = EXCLUDED.review_specialty,
       system_prompt_inject = EXCLUDED.system_prompt_inject,
       tool_scopes = EXCLUDED.tool_scopes,
       active = TRUE, updated_at = NOW()
     RETURNING *`,
    [id, parentId, name, role || null, specialty || null, systemPrompt || null, hue || 0,
     permission || 'worker', projectId || null, modelProvider || null, modelName || null,
     agentClass || null, reviewSpecialty || null, systemPromptInject || null, JSON.stringify(scopes)]
  );
  return rows[0];
}

export async function getSubAgents(parentId) {
  const { rows } = await pool.query(
    'SELECT * FROM sub_agents WHERE parent_id = $1 AND active = TRUE ORDER BY created_at',
    [parentId]
  );
  return rows;
}

export async function getSubAgentById(id) {
  const { rows } = await pool.query(
    'SELECT * FROM sub_agents WHERE id = $1 AND active = TRUE',
    [id]
  );
  return rows[0] || null;
}

export async function getAllSubAgents() {
  const { rows } = await pool.query(
    'SELECT * FROM sub_agents WHERE active = TRUE ORDER BY parent_id, created_at'
  );
  return rows;
}

export async function updateSubAgent(id, patch) {
  const fields = [];
  const values = [];
  let pi = 1;
  for (const [key, val] of Object.entries(patch)) {
    const dbKey = key === 'toolScopes' ? 'tool_scopes' : key;
    if (['name', 'role', 'specialty', 'system_prompt', 'hue', 'active', 'permission', 'project_id', 'github_branch', 'model_provider', 'model_name', 'class', 'review_specialty', 'system_prompt_inject', 'tool_scopes'].includes(dbKey)) {
      fields.push(`${dbKey} = $${pi++}`);
      values.push(dbKey === 'tool_scopes' ? JSON.stringify(val || {}) : val);
    }
  }
  if (fields.length === 0) return null;
  fields.push(`updated_at = NOW()`);
  values.push(id);
  const { rows } = await pool.query(
    `UPDATE sub_agents SET ${fields.join(', ')} WHERE id = $${pi} RETURNING *`,
    values
  );
  return rows[0];
}

export async function deleteSubAgent(id) {
  await pool.query('UPDATE sub_agents SET active = FALSE, updated_at = NOW() WHERE id = $1', [id]);
}

// ═══════════════════════════════════════════════════════════════════
//  SUB-AGENT SCRATCHPAD (per-project key-value store)
// ═══════════════════════════════════════════════════════════════════

export async function scratchpadWrite(subAgentId, project, key, value) {
  const { rows } = await pool.query(
    `INSERT INTO sub_agent_scratchpad (sub_agent_id, project, key, value)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (sub_agent_id, project, key) DO UPDATE SET
       value = EXCLUDED.value, updated_at = NOW()
     RETURNING *`,
    [subAgentId, project || 'default', key, value]
  );
  return rows[0];
}

export async function scratchpadRead(subAgentId, project, key) {
  if (key) {
    const { rows } = await pool.query(
      'SELECT key, value, updated_at FROM sub_agent_scratchpad WHERE sub_agent_id = $1 AND project = $2 AND key = $3',
      [subAgentId, project || 'default', key]
    );
    return rows[0] || null;
  }
  const { rows } = await pool.query(
    'SELECT key, value, updated_at FROM sub_agent_scratchpad WHERE sub_agent_id = $1 AND project = $2 ORDER BY updated_at DESC',
    [subAgentId, project || 'default']
  );
  return rows;
}

export async function scratchpadClear(subAgentId, project) {
  const { rows } = await pool.query(
    'DELETE FROM sub_agent_scratchpad WHERE sub_agent_id = $1 AND project = $2 RETURNING id',
    [subAgentId, project || 'default']
  );
  return rows.length;
}
