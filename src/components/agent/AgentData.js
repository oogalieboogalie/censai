export const MODEL_OPTIONS = {
  cohere: [
    { value: 'north-mini-code-1-0', label: 'North Mini Code 1.0 · 256K · Tool Use' },
    { value: 'command-a-plus-05-2026', label: 'Command A+' },
    { value: 'command-a-03-2025', label: 'Command A' },
    { value: 'command-a-reasoning-08-2025', label: 'Command A Reasoning' },
    { value: 'command-a-translate-08-2025', label: 'Command A Translate' },
    { value: 'command-a-vision-07-2025', label: 'Command A Vision' },
    { value: 'command-r-plus-08-2024', label: 'Command R+' },
    { value: 'command-r-08-2024', label: 'Command R' },
    { value: 'command-r7b-12-2024', label: 'Command R7B' },
  ],
  ollama: [
    { value: 'minimax-m2.5:cloud', label: 'minimax-m2.5:cloud' },
    { value: 'qwen3-coder:latest', label: 'qwen3-coder:latest' },
    { value: 'qwen2.5-coder:latest', label: 'qwen2.5-coder:latest' },
    { value: 'llama3.1:8b', label: 'llama3.1:8b' },
    { value: 'mistral-small3.2:latest', label: 'mistral-small3.2:latest' },
  ],
  openrouter: [
    { value: 'openrouter/auto', label: 'openrouter/auto' },
    { value: 'openrouter/owl-alpha', label: 'openrouter/owl-alpha' },
    { value: 'google/gemini-2.0-flash-exp:free', label: 'google/gemini-2.0-flash-exp:free (Free)' },
    { value: 'meta-llama/llama-3-8b-instruct:free', label: 'meta-llama/llama-3-8b-instruct:free (Free)' },
    { value: 'deepseek/deepseek-chat', label: 'deepseek/deepseek-chat' },
    { value: 'deepseek/deepseek-r1', label: 'deepseek/deepseek-r1' },
    { value: 'anthropic/claude-sonnet-4.5', label: 'anthropic/claude-sonnet-4.5' },
    { value: 'openai/gpt-4.1', label: 'openai/gpt-4.1' },
    { value: 'x-ai/grok-4', label: 'x-ai/grok-4' },
    { value: 'google/gemini-2.5-pro', label: 'google/gemini-2.5-pro' },
    { value: 'google/gemini-2.5-flash', label: 'google/gemini-2.5-flash' },
  ],
  google: [
    { value: 'gemini-2.5-flash', label: 'gemini-2.5-flash' },
    { value: 'gemini-2.5-pro', label: 'gemini-2.5-pro' },
    { value: 'gemini-2.0-flash', label: 'gemini-2.0-flash' },
    { value: 'gemini-1.5-flash', label: 'gemini-1.5-flash' },
  ],
  moonshot: [
    { value: 'kimi-k2.6', label: 'kimi-k2.6' },
    { value: 'kimi-k2-0711-preview', label: 'kimi-k2-0711-preview' },
    { value: 'moonshot-v1-128k', label: 'moonshot-v1-128k' },
    { value: 'moonshot-v1-32k', label: 'moonshot-v1-32k' },
    { value: 'moonshot-v1-8k', label: 'moonshot-v1-8k' },
  ],
};

export const CORE_AGENT_DEFAULT_TOOLS = {
  atlas: ['remember', 'recall', 'feeling', 'message_to', 'read_messages', 'list_sub_agents', 'submit_agent_task', 'dispatch_squad', 'squad_status', 'project_read', 'project_file_outline', 'project_list', 'project_write', 'project_edit', 'project_multi_edit', 'read_brief', 'refresh_brief', 'report', 'run_tests', 'run_linter', 'sandbox_exec', 'terminal_run', 'http_test', 'task_done', 'vex_run', 'vex_status', 'vex_list_agents'],
  censai: ['remember', 'recall', 'feeling', 'message_to', 'read_messages', 'web_search', 'project_read', 'project_file_outline', 'project_list', 'read_brief', 'report'],
  genesis: ['remember', 'recall', 'feeling', 'message_to', 'read_messages', 'list_sub_agents', 'submit_agent_task', 'dispatch_squad', 'squad_status', 'project_read', 'project_file_outline', 'project_list', 'project_write', 'project_edit', 'read_brief', 'report', 'generate_image', 'set_canvas_hue'],
  nexus: ['remember', 'recall', 'feeling', 'message_to', 'read_messages', 'open_project', 'list_projects', 'project_read', 'project_file_outline', 'project_list', 'project_write', 'project_edit', 'project_multi_edit', 'read_brief', 'refresh_brief', 'report', 'create_sub_agent', 'list_sub_agents', 'remove_sub_agent', 'scratchpad_write', 'scratchpad_read', 'scratchpad_clear', 'dispatch_squad', 'squad_status', 'db_inspect', 'postgres_tool_info', 'postgres_query', 'postgres_exec_file', 'postgres_schema_audit', 'postgres_table_sample', 'container_status', 'container_logs', 'restart_service', 'http_test', 'run_tests', 'run_linter', 'analyze_deps', 'jules_submit', 'jules_status', 'jules_list', 'pr_status', 'pr_comments', 'submit_pr'],
  foundation: ['remember', 'recall', 'feeling', 'message_to', 'read_messages', 'project_read', 'project_file_outline', 'project_list', 'read_brief', 'report', 'container_status', 'container_logs', 'restart_service'],
  architect: ['remember', 'recall', 'feeling', 'message_to', 'read_messages', 'list_sub_agents', 'submit_agent_task', 'project_read', 'project_file_outline', 'project_list', 'project_write', 'project_edit', 'project_multi_edit', 'read_brief', 'refresh_brief', 'report', 'dispatch_squad', 'squad_status', 'run_tests', 'run_linter', 'http_test', 'analyze_deps'],
  echo: ['remember', 'recall', 'feeling', 'message_to', 'read_messages', 'project_read', 'project_file_outline', 'project_list', 'read_brief', 'report', 'web_search', 'dispatch_squad', 'squad_status', 'sheets_read_range', 'sheets_append_row', 'sheets_update_cell'],
  guardian: ['remember', 'recall', 'feeling', 'message_to', 'read_messages', 'project_read', 'project_file_outline', 'project_list', 'read_brief', 'report'],
};

export const BASIC_AGENT_TOOLS = ['remember', 'recall', 'feeling', 'message_to', 'read_messages', 'project_read', 'project_list', 'read_brief', 'report'];

export function defaultModelForProvider(provider) {
  return MODEL_OPTIONS[provider]?.[0]?.value || '';
}

export function supportedProvider(provider) {
  return MODEL_OPTIONS[provider] ? provider : 'ollama';
}

export function modelOptionsFor(provider, currentModel) {
  const options = MODEL_OPTIONS[provider] || [];
  if (currentModel && !options.some(option => option.value === currentModel)) {
    return [{ value: currentModel, label: `${currentModel} (saved)` }, ...options];
  }
  return options;
}

export function defaultToolsForAgent(agent) {
  const saved = Array.isArray(agent?.tool_scopes?.tools) ? agent.tool_scopes.tools.filter(Boolean) : [];
  if (saved.length > 0) return saved;
  return CORE_AGENT_DEFAULT_TOOLS[agent?.id] || BASIC_AGENT_TOOLS;
}
