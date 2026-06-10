// Model options and tool defaults for AgentDesignerWindow
export const MODEL_OPTIONS = {
  ollama: [
    { value: 'minimax-m2.5:cloud', label: 'minimax-m2.5:cloud' },
    { value: 'qwen3-coder:latest', label: 'qwen3-coder:latest' },
    { value: 'qwen2.5-coder:latest', label: 'qwen2.5-coder:latest' },
    { value: 'llama3.1:8b', label: 'llama3.1:8b' },
    { value: 'mistral-small3.2:latest', label: 'mistral-small3.2:latest' },
  ],
  openrouter: [
    { value: 'openrouter/auto', label: 'openrouter/auto' },
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

export const DEFAULT_TOOLS = ['web_search', 'project_list', 'project_file_outline', 'project_read', 'read_brief', 'report'];

export function slugify(value) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function uniqueAgentId(name, type, agents) {
  const taken = new Set(agents.map(agent => agent.id));
  const base = slugify(name) || `${type}-agent`;
  let id = base;
  let n = 2;
  while (taken.has(id)) id = `${base}-${n++}`;
  return id;
}

export function defaultModelForProvider(provider) {
  return MODEL_OPTIONS[provider]?.[0]?.value || '';
}
