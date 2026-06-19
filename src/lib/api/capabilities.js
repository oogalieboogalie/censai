/**
 * Fetches capability records for the requested agent ID.
 * @param {string} agentId
 * @returns {Promise<{capabilities: Array}>}
 */
export async function getAgentCapabilities(agentId) {
  try {
    const res = await fetch(`/api/agents/${encodeURIComponent(agentId)}/capabilities`);
    if (!res.ok) throw new Error('Failed to fetch agent capabilities');
    return await res.json();
  } catch (err) {
    console.error('Failed to get agent capabilities:', err);
    return { capabilities: [] };
  }
}

/**
 * Saves capability records for the requested agent ID.
 * @param {string} agentId
 * @param {Array} capabilities
 * @returns {Promise<{ok: boolean}>}
 */
export async function saveAgentCapabilities(agentId, capabilities) {
  try {
    const res = await fetch(`/api/agents/${encodeURIComponent(agentId)}/capabilities`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ capabilities }),
    });
    if (!res.ok) throw new Error('Failed to save agent capabilities');
    return await res.json();
  } catch (err) {
    console.error('Failed to save agent capabilities:', err);
    return { ok: false };
  }
}

/**
 * Fetches the diagnostic list of allowed tools for an agent.
 * @param {string} agentId
 * @returns {Promise<{tools: Array<string>}>}
 */
export async function getAgentDebugTools(agentId) {
  try {
    const res = await fetch(`/api/agents/${encodeURIComponent(agentId)}/debug-tools`);
    if (!res.ok) throw new Error('Failed to fetch agent debug tools');
    return await res.json();
  } catch (err) {
    console.error('Failed to get agent debug tools:', err);
    return { tools: [] };
  }
}
