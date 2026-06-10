import { getSecret } from '../../secrets.js';
import { createLogger } from '../../logger.js';

export const log = createLogger('ai');

export const BASE_URL = (process.env.AI_BASE_URL || 'http://localhost:11434/v1').replace(/\/+$/, '');
export const getApiKey = () => getSecret('AI_API_KEY') || 'ollama';
export const MODEL = process.env.AI_MODEL || 'minimax-m2.5:cloud';
export const TASK_WORKER_TIMEOUT_MS = Math.max(5000, Number(process.env.AGENT_TASK_WORKER_TIMEOUT_MS) || 120000);
export const MAX_CHAT_MODEL_ROUNDS = 10;
export const FORCE_TOOL_SYNTHESIS_AFTER_ROUNDS = Math.min(
  MAX_CHAT_MODEL_ROUNDS - 1,
  Math.max(2, Number(process.env.AGENT_FORCE_TOOL_SYNTHESIS_AFTER_ROUNDS) || 6)
);
export const DIRECT_SYNTHESIS_TOOLS = new Set([
  'project_write',
  'project_edit',
  'project_multi_edit',
  'local_write_file',
  'github_write_file',
  'report',
  'task_done',
]);
export const OLLAMA_MODEL_ALIASES = new Map([
  ['gemma4:35b', 'gemma4:31b-cloud'],
  ['gemma4:35b:cloud', 'gemma4:31b-cloud'],
]);

export async function fetchChatCompletion(baseUrl, apiKey, body, timeoutMs = TASK_WORKER_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const done = log.startTimer();
  log.debug('chat completion request', {
    baseUrl,
    model: body?.model,
    messages: Array.isArray(body?.messages) ? body.messages.length : 0,
    tools: Array.isArray(body?.tools) ? body.tools.length : 0,
  });
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const err = await response.text();
      log.error('chat completion failed', { model: body?.model, status: response.status, ms: done() });
      throw new Error(`${response.status}: ${err}`);
    }
    const data = await response.json();
    log.info('chat completion ok', {
      model: body?.model,
      ms: done(),
      finishReason: data?.choices?.[0]?.finish_reason,
      promptTokens: data?.usage?.prompt_tokens,
      completionTokens: data?.usage?.completion_tokens,
    });
    return data;
  } catch (err) {
    if (err.name === 'AbortError') log.error('chat completion timed out', { model: body?.model, timeoutMs, ms: done() });
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export function extractMessageText(content) {
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) {
    return content
      .map(part => {
        if (typeof part === 'string') return part;
        if (part?.type === 'text') return part.text || '';
        if (typeof part?.text === 'string') return part.text;
        return '';
      })
      .join('\n')
      .trim();
  }
  return '';
}

export function publicToolActions(toolActions) {
  if (!toolActions.length) return undefined;
  return toolActions.map(action => ({
    tool: action.tool,
    ms: action.ms,
    round: action.round,
    result_chars: action.result_chars,
  }));
}

export function publicTimings(timings) {
  return {
    ...timings,
    tool_calls: (timings.tool_calls || []).map(action => ({
      tool: action.tool,
      ms: action.ms,
      round: action.round,
      result_chars: action.result_chars,
    })),
  };
}
