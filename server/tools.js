import { TOOL_REGISTRY } from './tools/handlers/index.js';
import { createLogger } from './logger.js';

export { TOOL_DEFINITIONS, filterToolsForAgent, listToolCatalog } from './tools/definitions.js';

const log = createLogger('tools');

// ═══════════════════════════════════════════════════════════════════
//  TOOL EXECUTOR ORCHESTRATOR
//  Dynamic entry point routing calls to specialized domain handlers.
// ═══════════════════════════════════════════════════════════════════

export async function executeTool(agentId, name, args, context = {}) {
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
