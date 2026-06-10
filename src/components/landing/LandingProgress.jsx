import React from 'react';
import { PROGRESS_POSTS } from '../../data/progress-posts.js';

export function ProgressFeed() {
  const [open, setOpen] = React.useState(true);
  const [expanded, setExpanded] = React.useState(null);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{
        all: 'unset', cursor: 'pointer', position: 'fixed', top: 72, right: 18, zIndex: 25,
        background: 'var(--surface)', border: '1px solid var(--hairline)',
        borderRadius: 12, padding: '8px 12px',
        boxShadow: 'var(--shadow-card)',
        fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.06em', color: 'var(--ink-soft)',
      }}>progress log →</button>
    );
  }

  return (
    <div style={{
      position: 'fixed', top: 72, right: 18, width: 320,
      maxHeight: 'calc(100vh - 110px)',
      background: 'var(--surface)', border: '1px solid var(--hairline)',
      borderRadius: 14, boxShadow: 'var(--shadow-card)',
      display: 'flex', flexDirection: 'column',
      zIndex: 25, overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 14px', borderBottom: '1px solid var(--hairline)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>progress log</div>
        </div>
        <button onClick={() => setOpen(false)} title="Hide" style={{ all: 'unset', cursor: 'pointer', color: 'var(--ink-faint)', display: 'flex' }}>
          <Icon.Close size={12} />
        </button>
      </div>
      <div style={{ overflowY: 'auto', padding: '4px 0' }}>
        {PROGRESS_POSTS.map((p) => {
          const isOpen = expanded === p.id;
          return (
            <div key={p.id} style={{ padding: '12px 14px', borderBottom: '1px solid var(--hairline)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-faint)' }}>{p.date}</span>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
                  padding: '2px 6px', borderRadius: 4,
                  background: 'var(--surface-2)', color: 'var(--ink-soft)',
                }}>{p.tag}</span>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: 'var(--ink)', letterSpacing: '-0.005em', marginBottom: 4, lineHeight: 1.3 }}>
                {p.title}
              </div>
              <div style={{
                fontSize: 12, lineHeight: 1.5, color: 'var(--ink-soft)',
                maxHeight: isOpen ? 600 : 38, overflow: 'hidden',
                position: 'relative', transition: 'max-height 0.25s ease',
              }}>
                {p.body}
              </div>
              <button onClick={() => setExpanded(isOpen ? null : p.id)} style={{
                all: 'unset', cursor: 'pointer', marginTop: 4,
                fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em',
                color: 'var(--accent-ink)', textTransform: 'uppercase',
              }}>{isOpen ? '— less' : '+ more'}</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}


