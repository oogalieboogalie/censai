import React from 'react';
import { api } from '../../lib/api.js';

export function useAgentActivity(agentId) {
  const [activity, setActivity] = React.useState({ wakeups: [], unread: 0 });

  React.useEffect(() => {
    if (!agentId) return undefined;
    let alive = true;
    const load = () => api.getAgentActivity(agentId)
      .then(data => { if (alive) setActivity(data); })
      .catch(() => {});
    load();
    const timer = setInterval(load, 3000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [agentId]);

  const active = activity.wakeups?.find(wake =>
    ['queued', 'in_progress', 'waiting_children'].includes(wake.status)
  );
  const latest = activity.wakeups?.[0];
  return {
    unread: activity.unread || 0,
    status: active?.status || (activity.unread ? 'notified' : latest?.status === 'failed' ? 'failed' : 'idle'),
    detail: active?.subject || active?.sender_name || latest?.error || '',
  };
}
