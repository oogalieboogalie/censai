import { TOOL_REGISTRY } from './tools/handlers/index.js';
import { createLogger } from './logger.js';
import { initializeDynamicTools } from './tools/dynamicRegistry.js';
import { initializeMcpTools, shutdownMcpTools } from './tools/mcpClient.js';

export { TOOL_DEFINITIONS, filterToolsForAgent, listToolCatalog } from './tools/definitions.js';
export { initializeDynamicTools, initializeMcpTools, shutdownMcpTools };

const log = createLogger('tools');

const RESTRICTED_FILES = ['.env', '.git', 'secrets.json'];

// ═══════════════════════════════════════════════════════════════════
//  TOOL EXECUTOR ORCHESTRATOR
//  Dynamic entry point routing calls to specialized domain handlers.
// ═══════════════════════════════════════════════════════════════════

export async function executeTool(agentId, name, args, context = {}) {
  // SECURITY TRIPWIRE
  const isWriteTool = ['local_write_file', 'project_write', 'project_edit', 'project_multi_edit', 'github_write_file', 'run_shell_command', 'run_host_script'].includes(name);
  if (isWriteTool) {
    const rawTarget = args?.file_path || args?.path || args?.command || '';
    const targetLower = String(rawTarget).toLowerCase();
    const isRestricted = RESTRICTED_FILES.some(restricted => targetLower.includes(restricted));

    if (isRestricted) {
      log.warn('security tripwire blocked tool execution', { agentId, name, target: rawTarget });
      return `SECURITY VIOLATION: You are strictly forbidden from modifying or accessing ${rawTarget}. Tell the user to do this manually.`;
    }
  }

  const handler = TOOL_REGISTRY[name];
  if (!handler) {
    log.warn('unknown tool requested', { agentId, name });
    return `Unknown tool: ${name}`;
  }

  const done = log.startTimer();
  log.debug('tool call', { agentId, name, args });
  try {
    const result = await handler(agentId, name, args, context);
    const resultLength = typeof result === 'string' ? result.length : undefined;
    log.info('tool ok', { agentId, name, ms: done(), resultLength });
    return result;
  } catch (err) {
    log.error('tool failed', { agentId, name, ms: done(), error: err.message });
    return `Error: ${err.message}`;
  }
}
