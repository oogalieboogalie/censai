import React, { useState, useCallback } from 'react';
import { Icon } from './Icons.jsx';
import { DEFAULT_THEME, SettingsPanel } from './windows/WindowThemePanel.jsx';

const DEFAULT_CODE = `// Write code here.
function greet(name) {
  return 'Hello, ' + name + '!';
}

console.log(greet('Censai'));`;

const codeContentCache = new Map();

const lineCount = (value) => Math.max(1, String(value || '').split('\n').length);

export function CodeEditorWindow({ win, onUpdate, onSpawn }) {
  const [code, setCode] = React.useState(win.code || DEFAULT_CODE);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const lines = React.useMemo(() => Array.from({ length: lineCount(code) }, (_, i) => i + 1), [code]);
  const [showSettings, setShowSettings] = useState(false);
  const theme = win.editorTheme || { ...DEFAULT_THEME };
  const fileLabel = win.fileName || win.title || 'Code Editor';
  const sourceLabel = win.filePath ? (win.isGithub ? 'github' : 'local file') : 'plain text';

  const handleThemeChange = useCallback((newTheme) => onUpdate({ editorTheme: newTheme }), [onUpdate]);

  React.useEffect(() => {
    if (typeof win.code === 'string' && win.code !== code) setCode(win.code);
  }, [win.code]);

  React.useEffect(() => {
    if (!win.filePath) return;

    const url = win.isGithub
      ? `/api/github/file?repo=${encodeURIComponent(win.githubRepo)}&path=${encodeURIComponent(win.filePath)}`
      : `/api/files/content?path=${encodeURIComponent(win.filePath)}`;

    if (codeContentCache.has(url)) {
      const cached = codeContentCache.get(url);
      setCode(cached);
      onUpdate?.({ code: cached });
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (cancelled) return;
        if (data.error) throw new Error(data.error);
        const next = data.content || '';
        codeContentCache.set(url, next);
        setCode(next);
        onUpdate?.({ code: next });
        setLoading(false);
      })
      .catch(err => {
        if (cancelled) return;
        setCode(`Failed to load file: ${err.message}`);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [win.filePath, win.isGithub, win.githubRepo]);

  const updateCode = (next) => {
    setCode(next);
    onUpdate?.({ code: next });
  };

  const saveFile = async () => {
    if (!win.filePath || win.isGithub) return;
    setSaving(true);
    try {
      await fetch('/api/files/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: win.filePath, content: code })
      });
      const url = `/api/files/content?path=${encodeURIComponent(win.filePath)}`;
      codeContentCache.set(url, code);
    } catch (e) {
      console.error('Failed to save code file:', e);
    }
    setSaving(false);
  };

  const previewAsHtml = () => {
    onSpawn?.('htmlPreview', {
      title: 'HTML Preview',
      fileName: /\.html?$/i.test(fileLabel) ? fileLabel : `${fileLabel}.html`,
      html: code,
    });
  };

  return (
    <>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 36px 8px 28px',
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--ink-soft)',
        borderBottom: '1px dashed var(--hairline)',
        background: 'color-mix(in oklab, var(--ps-blue) 8%, transparent)',
        flexShrink: 0,
      }}>
        <span style={{ color: 'var(--ps-blue)', display: 'flex' }}><Icon.Code size={14} /></span>
        <span>{fileLabel}</span>
        <span style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--ink-faint)', fontWeight: 400 }}>{loading ? 'loading...' : sourceLabel}</span>
        {win.language && <span style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--ink-faint)', fontWeight: 400 }}>· {win.language}</span>}
        {win.isGithub && <span style={{ fontSize: 9, background: 'var(--surface-2)', padding: '2px 6px', borderRadius: 4, color: 'var(--ink)' }}>{win.githubRepo}</span>}
        <div style={{ flex: 1 }} />
        {win.filePath && !win.isGithub && (
          <button
            onClick={(e) => { e.stopPropagation(); saveFile(); }}
            disabled={saving}
            title="Save local file"
            style={{ all: 'unset', cursor: saving ? 'wait' : 'pointer', color: 'var(--accent-ink)', border: '1px solid var(--hairline)', borderRadius: 7, padding: '4px 7px', textTransform: 'none', letterSpacing: 0, fontSize: 11, fontWeight: 700, opacity: saving ? 0.5 : 1 }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        )}
        <button
          onClick={() => setShowSettings(!showSettings)}
          onPointerDown={(e) => e.stopPropagation()}
          title="Editor theme settings"
          style={{
            background: showSettings ? 'rgba(96, 165, 250, 0.15)' : 'transparent',
            border: 'none',
            borderRadius: 4,
            padding: 4,
            cursor: 'pointer',
            color: showSettings ? '#60a5fa' : '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
            marginRight: 8,
          }}
        >
          <Icon.Gear size={14} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); previewAsHtml(); }}
          title="Open contents in HTML Preview"
          style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: 'var(--accent-ink)', background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 7, padding: '4px 7px', textTransform: 'none', letterSpacing: 0, fontSize: 11, fontWeight: 700 }}
        >
          <Icon.Eye size={12} />
          Preview
        </button>
      </div>

      {showSettings && (
        <SettingsPanel
          title="Editor Theme"
          theme={theme}
          onThemeChange={handleThemeChange}
          onClose={() => setShowSettings(false)}
        />
      )}

      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '48px minmax(0, 1fr)', background: theme.background, color: theme.foreground, fontFamily: 'var(--font-mono)', fontSize: theme.fontSize || 13 }}>
        <div aria-hidden="true" style={{ padding: '12px 8px', textAlign: 'right', color: theme.selectionBackground, background: 'rgba(0,0,0,0.2)', borderRight: `1px solid ${theme.black}`, overflow: 'hidden', lineHeight: 1.55, userSelect: 'none' }}>
          {lines.map(n => <div key={n}>{n}</div>)}
        </div>
        <textarea
          value={code}
          onChange={(e) => updateCode(e.target.value)}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          style={{
            width: '100%',
            height: '100%',
            resize: 'none',
            border: 0,
            outline: 'none',
            padding: 12,
            background: 'transparent',
            color: theme.foreground,
            font: 'inherit',
            lineHeight: 1.55,
            tabSize: 2,
            whiteSpace: 'pre',
            overflow: 'auto',
          }}
        />
      </div>
    </>
  );
}
