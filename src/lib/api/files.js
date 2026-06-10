
export async function searchFiles(query) {
    const res = await fetch(`/api/files/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error('Search failed');
    return await res.json();
  }

export async function getBacklinks(path) {
    const res = await fetch(`/api/files/backlinks?path=${encodeURIComponent(path)}`);
    if (!res.ok) throw new Error('Backlinks fetch failed');
    return await res.json();
  }
