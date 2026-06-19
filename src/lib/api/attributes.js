/**
 * Fetches all available attribute definitions.
 * @returns {Promise<{attributes: Array}>}
 */
export async function getAttributes() {
  try {
    const res = await fetch('/api/attributes');
    if (!res.ok) throw new Error('Failed to fetch attribute definitions');
    return await res.json();
  } catch (err) {
    console.error('Failed to get attributes:', err);
    return { attributes: [] };
  }
}

/**
 * Fetches equipped attribute IDs for the requested agent ID.
 * @param {string} agentId
 * @returns {Promise<{attributes: Array<string>}>}
 */
export async function getAgentAttributes(agentId) {
  try {
    const res = await fetch(`/api/agents/${encodeURIComponent(agentId)}/attributes`);
    if (!res.ok) throw new Error('Failed to fetch agent attributes');
    return await res.json();
  } catch (err) {
    console.error('Failed to get agent attributes:', err);
    return { attributes: [] };
  }
}

/**
 * Saves equipped attributes for the requested agent ID.
 * @param {string} agentId
 * @param {Array<string>} attributeIds
 * @returns {Promise<{ok: boolean}>}
 */
export async function saveAgentAttributes(agentId, attributeIds) {
  try {
    const res = await fetch(`/api/agents/${encodeURIComponent(agentId)}/attributes`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attributes: attributeIds }),
    });
    if (!res.ok) throw new Error('Failed to save agent attributes');
    return await res.json();
  } catch (err) {
    console.error('Failed to save agent attributes:', err);
    return { ok: false };
  }
}

/**
 * Sends a template prompt and active attributes list to compile and preview.
 * @param {string} agentId
 * @param {string} template
 * @param {Array<string>} attributeIds
 * @returns {Promise<{compiled: string}>}
 */
export async function compilePromptPreview(agentId, template, attributeIds) {
  try {
    const res = await fetch(`/api/agents/${encodeURIComponent(agentId)}/compile-prompt-preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template, attributes: attributeIds }),
    });
    if (!res.ok) throw new Error('Failed to compile prompt preview');
    return await res.json();
  } catch (err) {
    console.error('Failed to compile prompt preview:', err);
    return { compiled: '' };
  }
}
