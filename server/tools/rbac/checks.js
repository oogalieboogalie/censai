import pool from '../../db.js';
import { getAgent, getSubAgentById } from '../../memory.js';
import { TOOL_DEFINITIONS } from '../definitions.js';
import { CAPABILITY_TO_TOOLS } from './capabilities.js';
import { TOOL_DISCOVERY_NAMES } from '../definitions/discovery.js';
import { 
  AGENT_CLASS_TOOL_WHITELIST, 
  SUB_AGENT_TOOL_WHITELIST, 
  FULL_TOOL_ACCESS_AGENT_IDS, 
  CORE_AGENT_TOOL_WHITELIST,
  TASK_SUBMISSION_GATED_TOOLS 
} from './constants.js';

export async function hasUnreadTaskSubmission(agentId) {
  const { rows } = await pool.query(
    `SELECT 1 FROM agent_messages WHERE to_agent = $1 AND read_at IS NULL
       AND (message_type = 'task_submission' OR subject ILIKE 'Task submitted:%' OR subject ILIKE 'Squad complete:%')
     LIMIT 1`,
    [agentId]
  );
  return rows.length > 0;
}

export function appendToolsByName(tools, names) {
  const seen = new Set(tools.map(tool => tool.function.name));
  const additions = TOOL_DEFINITIONS.filter(tool => names.includes(tool.function.name) && !seen.has(tool.function.name));
  return [...tools, ...additions];
}

export async function filterToolsForAgent(agentId) {
  let matched = TOOL_DEFINITIONS;
  try {
    const sub = await getSubAgentById(agentId);
    let toolScopes = null;
    let allowedDefaults = [];

    if (sub) {
      const classList = sub.class ? AGENT_CLASS_TOOL_WHITELIST[sub.class] : null;
      const tierList = SUB_AGENT_TOOL_WHITELIST[sub.permission || 'worker'];
      allowedDefaults = classList || tierList || [];
      toolScopes = sub.tool_scopes;
    } else if (FULL_TOOL_ACCESS_AGENT_IDS.has(agentId)) {
      allowedDefaults = TOOL_DEFINITIONS.map(t => t.function.name);
    } else if (CORE_AGENT_TOOL_WHITELIST[agentId]) {
      allowedDefaults = CORE_AGENT_TOOL_WHITELIST[agentId];
      const agent = await getAgent(agentId);
      toolScopes = agent?.tool_scopes;
    } else {
      const agent = await getAgent(agentId);
      toolScopes = agent?.tool_scopes;
      allowedDefaults = [
        'remember', 'recall', 'feeling', 'message_to', 'read_messages',
        'project_read', 'project_list', 'read_brief', 'report'
      ];
    }

    // Fetch persisted capabilities from database
    let additionalTools = [];
    try {
      const capRes = await pool.query(
        'SELECT capability_id, mode FROM agent_capabilities WHERE agent_id = $1',
        [agentId]
      );
      const activeCaps = capRes.rows.filter(r => r.mode === 'execute_with_approval' || r.mode === 'autonomous');
      for (const cap of activeCaps) {
        const tools = CAPABILITY_TO_TOOLS[cap.capability_id] || [];
        additionalTools.push(...tools);
      }
    } catch (dbErr) {
      console.warn(`[Capabilities] Failed to fetch capabilities for agent ${agentId}:`, dbErr.message);
    }

    const allowed = new Set([...allowedDefaults, ...additionalTools]);
    matched = TOOL_DEFINITIONS.filter(t => allowed.has(t.function.name));

    const selectedTools = Array.isArray(toolScopes?.tools) ? toolScopes.tools.filter(Boolean) : [];
    if (toolScopes?.mode === 'custom' && selectedTools.length > 0) {
      const selected = new Set(selectedTools);
      matched = TOOL_DEFINITIONS.filter(t => selected.has(t.function.name));
    } else if (selectedTools.length > 0) {
      const selected = new Set(selectedTools);
      matched = matched.filter(t => selected.has(t.function.name));
    }

    if (!sub && await hasUnreadTaskSubmission(agentId)) {
      matched = appendToolsByName(matched, TASK_SUBMISSION_GATED_TOOLS);
    }
  } catch {}

  matched = appendToolsByName(matched, TOOL_DISCOVERY_NAMES);
  return matched.map(({ type, function: fn }) => ({ type, function: fn }));
}
