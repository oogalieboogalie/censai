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

export async function getSession() {
  const res = await fetch('/api/auth/session');
  return res.json().catch(() => ({ authenticated: false }));
}

export async function logout() {
  const res = await fetch('/api/auth/logout');
  return res.json().catch(() => ({ authenticated: false }));
}

export async function developerLogin({ email, name }) {
  const res = await fetch('/api/auth/developer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Login failed');
  return data;
}
