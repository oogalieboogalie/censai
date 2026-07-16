import React, { useState, useCallback } from 'react';
import { Icon } from './Icons.jsx';
import { DEFAULT_THEME, SettingsPanel } from './windows/WindowThemePanel.jsx';
import { WindowTitle } from './windows/WindowTitle.jsx';
import { highlightCode } from '../lib/codeHighlighter.js';
import { normalizeCodeServerUrl } from '../lib/codeServerUrl.js';
import { CodeServerIframeView } from './CodeServerIframeView.jsx';

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
  const preRef = React.useRef(null);
  const lineNumbersRef = React.useRef(null);
  const handleScroll = (e) => {
    if (preRef.current) {
      preRef.current.scrollTop = e.target.scrollTop;
      preRef.current.scrollLeft = e.target.scrollLeft;
    }
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.target.scrollTop;
    }
  };

  const theme = win.editorTheme || { ...DEFAULT_THEME };
  const fileLabel = win.fileName || win.title || 'Code Editor';
  // Iframe mount mode (code-server / self-hosted-iframe) wins over local + GitHub
  // because it's the "outermost" mode — the editor is replaced wholesale.
  const codeServerUrl = win.codeServerUrl ? normalizeCodeServerUrl(win.codeServerUrl) : '';
  const isIframeMode = codeServerUrl.length > 0;
  const sourceLabel = isIframeMode
    ? 'code-server'
    : (win.filePath ? (win.isGithub ? 'github' : 'local file') : 'plain text');

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
      <WindowTitle
        accent={theme.cursor || theme.blue || 'var(--ps-blue)'}
        icon={<Icon.Code size={14} />}
        label={fileLabel}
        subtitle={(loading ? 'loading...' : sourceLabel) + (win.language ? ` · ${win.language}` : '')}
        attachedAgentIds={win.attachedAgents}
        onDetach={(id) => onUpdate?.({ attachedAgents: (win.attachedAgents || []).filter(a => a !== id) })}
      >
        {win.isGithub && <span style={{ fontSize: 9, background: 'var(--surface-2)', padding: '2px 6px', borderRadius: 4, color: 'var(--ink)' }}>{win.githubRepo}</span>}
        {isIframeMode && <span data-code-server-url-badge style={{ fontFamily: 'var(--font-mono)', fontSize: 9, background: 'var(--surface-2)', padding: '2px 6px', borderRadius: 4, color: 'var(--ink)' }} title={codeServerUrl}>{codeServerUrl}</span>}
        {win.filePath && !win.isGithub && !isIframeMode && (
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
        {!isIframeMode && (
          <button
            onClick={(e) => { e.stopPropagation(); previewAsHtml(); }}
            title="Open contents in HTML Preview"
            style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: 'var(--accent-ink)', background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 7, padding: '4px 7px', textTransform: 'none', letterSpacing: 0, fontSize: 11, fontWeight: 700 }}
          >
            <Icon.Eye size={12} />
            Preview
          </button>
        )}
      </WindowTitle>

      {showSettings && (
        <SettingsPanel
          title="Editor Theme"
          theme={theme}
          onThemeChange={handleThemeChange}
          onClose={() => setShowSettings(false)}
        />
      )}

      {isIframeMode ? (
        <CodeServerIframeView url={codeServerUrl} theme={theme} winOpacity={win.opacity} />
      ) : (
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(48px, auto) minmax(0, 1fr)', background: win.opacity !== undefined ? 'transparent' : theme.background, color: theme.foreground, fontFamily: 'var(--font-mono)', fontSize: theme.fontSize || 13 }}>
        <div
          ref={lineNumbersRef}
          aria-hidden="true"
          style={{
            padding: '12px 8px',
            textAlign: 'right',
            color: theme.selectionBackground,
            background: win.opacity !== undefined ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.2)',
            borderRight: `1px solid ${theme.black}`,
            overflow: 'hidden',
            lineHeight: 1.55,
            userSelect: 'none'
          }}
        >
          {lines.map(n => <div key={n}>{n}</div>)}
        </div>
        <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 0 }}>
          <pre
            ref={preRef}
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              margin: 0,
              padding: 12,
              border: 0,
              background: 'transparent',
              fontFamily: 'inherit',
              fontSize: 'inherit',
              lineHeight: 1.55,
              tabSize: 2,
              whiteSpace: 'pre',
              overflow: 'hidden',
              pointerEvents: 'none',
              color: theme.foreground,
              zIndex: 1,
            }}
            dangerouslySetInnerHTML={{ __html: highlightCode(code, theme) + (code.endsWith('\n') ? ' ' : '') }}
          />
          <textarea
            value={code}
            onChange={(e) => updateCode(e.target.value)}
            onScroll={handleScroll}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              height: '100%',
              resize: 'none',
              border: 0,
              outline: 'none',
              padding: 12,
              background: 'transparent',
              color: 'transparent',
              caretColor: theme.cursor || theme.foreground || 'var(--ink)',
              fontFamily: 'inherit',
              fontSize: 'inherit',
              lineHeight: 1.55,
              tabSize: 2,
              whiteSpace: 'pre',
              overflow: 'auto',
              zIndex: 2,
            }}
          />
        </div>
      </div>
      )}
    </>
  );
}
