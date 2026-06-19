export async function getAgentActivity(agentId) {
  const res = await fetch(`/api/agent-wakeups/${encodeURIComponent(agentId)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Failed to load agent activity');
  return data;
}
