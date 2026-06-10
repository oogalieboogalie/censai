
export async function getToolCatalog() {
    const res = await fetch('/api/tool-catalog');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'Failed to fetch tool catalog');
    return data;
  }

export async function getJulesSessions({ refresh = false, includeCompleted = false } = {}) {
    const params = new URLSearchParams();
    if (refresh) params.set('refresh', 'true');
    if (includeCompleted) params.set('includeCompleted', 'true');
    const res = await fetch(`/api/jules/sessions?${params}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'Failed to fetch Jules sessions');
    return data;
  }
