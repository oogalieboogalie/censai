import React from 'react';
import { Icon } from '../Icons.jsx';

export function MockFileExplorer() {
  const [open, setOpen] = React.useState(true);
  // File names map to entries in DocWindow's FILE_CONTENTS, so drop spawns
  // a doc window with real-feeling content. Edit the labels here if you
  // want different files showcased.
  const files = [
    { name: 'README.md', kind: 'md', hint: 'project overview' },
    { name: 'week-32.md', kind: 'md', hint: 'newsletter draft' },
    { name: 'config.yaml', kind: 'cfg', hint: 'automation' },
    { name: 'transcripts.md', kind: 'md', hint: 'interview' },
    { name: 'arxiv.json', kind: 'json', hint: 'research feed' },
    { name: 'cover-direction.fig', kind: 'fig', hint: 'design brief' },
  ];

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{
        all: 'unset', cursor: 'pointer',
        position: 'fixed', bottom: 100, left: 18, zIndex: 25,
        background: 'var(--surface)', border: '1px solid var(--hairline)',
        borderRadius: 12, padding: '8px 12px',
        boxShadow: 'var(--shadow-card)',
        fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.06em', color: 'var(--ink-soft)',
      }}>files →</button>
    );
  }

  return (
    <div style={{
      position: 'fixed', bottom: 100, left: 18, width: 252,
      maxHeight: 'calc(100vh - 700px)', minHeight: 230,
      background: 'var(--surface)', border: '1px solid var(--hairline)',
      borderRadius: 14, boxShadow: 'var(--shadow-card)',
      display: 'flex', flexDirection: 'column',
      zIndex: 25, overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 12px', borderBottom: '1px solid var(--hairline)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FolderGlyph />
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>weekly-newsletter</div>
        </div>
        <button onClick={() => setOpen(false)} title="Hide" style={{ all: 'unset', cursor: 'pointer', color: 'var(--ink-faint)', display: 'flex' }}>
          <Icon.Close size={12} />
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        {files.map((f) => (
          <FileRow key={f.name} file={f} />
        ))}
      </div>
      <div style={{
        padding: '8px 12px', borderTop: '1px solid var(--hairline)',
        fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-faint)',
        letterSpacing: '0.06em',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 9l-3 3 3 3"/><path d="M9 5l3-3 3 3"/><path d="M15 19l-3 3-3-3"/><path d="M19 9l3 3-3 3"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></svg>
        drag a file onto the canvas →
      </div>
    </div>
  );
}

function FileRow({ file }) {
  const [hover, setHover] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/x-homebase-file', file.name);
        e.dataTransfer.effectAllowed = 'copy';
        setDragging(true);
      }}
      onDragEnd={() => setDragging(false)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 12px',
        cursor: 'grab',
        background: hover ? 'var(--surface-2)' : 'transparent',
        opacity: dragging ? 0.5 : 1,
        transition: 'background 0.12s, opacity 0.12s',
      }}
    >
      <FileGlyph kind={file.kind} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--ink-faint)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{file.hint}</div>
      </div>
    </div>
  );
}

function FolderGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--ink-soft)' }}>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  );
}

function FileGlyph({ kind }) {
  const color = {
    md:   'oklch(0.66 0.14 240)',
    cfg:  'oklch(0.68 0.14 60)',
    json: 'oklch(0.50 0.20 25)',
    fig:  'oklch(0.66 0.18 310)',
  }[kind] || 'var(--ink-soft)';
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  );
}


