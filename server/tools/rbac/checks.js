import pool from '../../db.js';
import { getAgent, getSubAgentById } from '../../memory.js';
import { TOOL_DEFINITIONS } from '../definitions.js';
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
    if (sub) {
      const classList = sub.class ? AGENT_CLASS_TOOL_WHITELIST[sub.class] : null;
      const tierList = SUB_AGENT_TOOL_WHITELIST[sub.permission || 'worker'];
      const allowed = new Set(classList || tierList || []);
      matched = TOOL_DEFINITIONS.filter(t => allowed.has(t.function.name));
      toolScopes = sub.tool_scopes;
    } else if (FULL_TOOL_ACCESS_AGENT_IDS.has(agentId)) {
      matched = TOOL_DEFINITIONS;
    } else if (CORE_AGENT_TOOL_WHITELIST[agentId]) {
      const allowed = new Set(CORE_AGENT_TOOL_WHITELIST[agentId]);
      matched = TOOL_DEFINITIONS.filter(t => allowed.has(t.function.name));
      const agent = await getAgent(agentId);
      toolScopes = agent?.tool_scopes;
    } else {
      const agent = await getAgent(agentId);
      toolScopes = agent?.tool_scopes;
      const selectedTools = Array.isArray(toolScopes?.tools) ? toolScopes.tools.filter(Boolean) : [];
      if (agent && toolScopes?.mode === 'custom' && selectedTools.length > 0) {
        matched = TOOL_DEFINITIONS.filter(t => selectedTools.includes(t.function.name));
        return matched.map(({ type, function: fn }) => ({ type, function: fn }));
      }
      const allowed = new Set([
        'remember', 'recall', 'feeling', 'message_to', 'read_messages',
        'project_read', 'project_list', 'read_brief', 'report'
      ]);
      matched = TOOL_DEFINITIONS.filter(t => allowed.has(t.function.name));
    }

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
  
  return matched.map(({ type, function: fn }) => ({ type, function: fn }));
}
