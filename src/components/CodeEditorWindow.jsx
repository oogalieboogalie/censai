import React, { useState, useCallback } from 'react';
import { Icon } from './Icons.jsx';
import { DEFAULT_THEME, SettingsPanel } from './windows/WindowThemePanel.jsx';

const DEFAULT_CODE = `// Write code here.
function greet(name) {
  return 'Hello, ' + name + '!';
}

console.log(greet('Censai'));`;

function lineCount(value) {
  return Math.max(1, String(value || '').split('\n').length);
}

export function CodeEditorWindow({ win, onUpdate, onSpawn }) {
  const [code, setCode] = React.useState(win.code || DEFAULT_CODE);
  const lines = React.useMemo(() => Array.from({ length: lineCount(code) }, (_, i) => i + 1), [code]);
  const [showSettings, setShowSettings] = useState(false);
  const theme = win.editorTheme || { ...DEFAULT_THEME };

  const handleThemeChange = useCallback((newTheme) => {
    onUpdate({ editorTheme: newTheme });
  }, [onUpdate]);

  React.useEffect(() => {
    if (typeof win.code === 'string' && win.code !== code) {
      setCode(win.code);
    }
  }, [win.code]);

  const updateCode = (next) => {
    setCode(next);
    onUpdate?.({ code: next });
  };

  const previewAsHtml = () => {
    onSpawn?.('htmlPreview', {
      title: 'HTML Preview',
      fileName: `${win.title || 'code'}.html`,
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
        <span>{win.title || 'Code Editor'}</span>
        <span style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--ink-faint)', fontWeight: 400 }}>plain text</span>
        <div style={{ flex: 1 }} />
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
