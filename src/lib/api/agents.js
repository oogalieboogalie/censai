import { apiLog } from './storage.js';

/**
   * Fetches all available agents from the database.
   * @returns {Promise<Agent[]>}
   */
export async function getAgents() {
    try {
      const res = await fetch('/api/agents');
      if (!res.ok) throw new Error('Failed to fetch agents');
      return await res.json();
    } catch (e) {
      console.error('Failed to get agents from backend', e);
      return [];
    }
  }

/**
   * Fetches the number of private journal entries for an agent.
   * Entry content is never available over HTTP — count only.
   * @returns {Promise<number>}
   */
export async function getJournalCount(agentId) {
    try {
      const res = await fetch(`/api/journals/${encodeURIComponent(agentId)}/count`);
      if (!res.ok) throw new Error('Failed to fetch journal count');
      const data = await res.json();
      return data.count ?? 0;
    } catch (e) {
      apiLog('Failed to get journal count', e);
      return 0;
    }
  }

export async function saveAgent(agent) {
    const method = agent?.id ? 'PUT' : 'POST';
    const url = agent?.id ? `/api/agents/${encodeURIComponent(agent.id)}` : '/api/agents';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(agent),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'Failed to save agent');
    return data;
  }

export async function createAgent(agent) {
    const res = await fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(agent),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'Failed to create agent');
    return data;
  }

export async function createSubAgent(subAgent) {
    const res = await fetch('/api/sub-agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subAgent),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'Failed to create sub-agent');
    return data;
  }

/**
   * Sends a message to an agent.
   * @param {string} agentId
   * @param {Object[]} messages
   * @returns {Promise<Object>}
   */
export async function sendMessage(agentId, messages) {
    const done = apiLog.startTimer();
    apiLog.debug('chat send', { agentId, messages: Array.isArray(messages) ? messages.length : 0 });
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, agentId }),
    });
    if (!res.ok) {
      apiLog.error('chat send failed', { agentId, status: res.status, ms: done() });
      throw new Error('Chat API failed');
    }
    apiLog.info('chat send ok', { agentId, ms: done() });
    return await res.json();
  }
