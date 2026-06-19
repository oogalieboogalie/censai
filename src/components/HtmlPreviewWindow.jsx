import React from 'react';
import { Icon } from './Icons.jsx';
import { WindowTitle } from './Windows.jsx';

export function HtmlPreviewWindow({ win, onUpdate }) {
  const [html, setHtml] = React.useState(win.html || '');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (win.html || !win.filePath) return;
    setLoading(true);
    setError('');
    const url = win.isGithub
      ? `/api/github/file?repo=${encodeURIComponent(win.githubRepo)}&path=${encodeURIComponent(win.filePath)}`
      : `/api/files/content?path=${encodeURIComponent(win.filePath)}`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setHtml(data.content || '');
        onUpdate?.({ html: data.content || '' });
      })
      .catch(err => setError(err.message || 'Failed to load HTML'))
      .finally(() => setLoading(false));
  }, [win.filePath, win.githubRepo, win.html, win.isGithub, onUpdate]);

  return (
    <>
      <WindowTitle
        accent="var(--accent)"
        icon={<Icon.Files size={14} />}
        label="HTML Preview"
        subtitle={win.fileName || 'untitled.html'}
        attachedAgentIds={win.attachedAgents}
        onDetach={(id) => onUpdate?.({ attachedAgents: (win.attachedAgents || []).filter(a => a !== id) })}
      />
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'white' }}>
        {loading && (
          <div style={{ padding: 16, color: 'var(--ink-faint)', background: 'var(--surface)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
            Loading HTML preview...
          </div>
        )}
        {error && (
          <div style={{ padding: 16, color: 'var(--ps-red)', background: 'var(--surface)', fontSize: 12 }}>
            {error}
          </div>
        )}
        {!loading && !error && (
          <iframe
            title={win.fileName || 'HTML preview'}
            srcDoc={html}
            sandbox="allow-scripts allow-forms allow-popups allow-modals"
            style={{ flex: 1, width: '100%', border: 0, display: 'block', background: 'white' }}
          />
        )}
      </div>
    </>
  );
}
