import React from 'react';
import { renderMarkdown } from '../../lib/renderMarkdown.jsx';
import { Icon } from '../Icons.jsx';

export function ChatBubble({ message: m, index, copied, onCopy }) {
  const canCopy = !m.hidden && String(m.text || '').length > 0;
  return (
    <div style={{ display: 'flex', justifyContent: m.hidden ? 'center' : (m.from === 'me' ? 'flex-end' : 'flex-start') }}>
      <div style={{
        maxWidth: m.hidden ? '92%' : '78%',
        padding: m.hidden ? '5px 9px' : (canCopy ? '8px 34px 8px 12px' : '8px 12px'),
        borderRadius: m.hidden ? 999 : 14,
        background: m.hidden ? 'var(--surface)' : (m.from === 'me' ? 'var(--accent-soft)' : 'var(--surface-2)'),
        color: m.hidden ? 'var(--ink-faint)' : (m.from === 'me' ? 'var(--accent-ink)' : 'var(--ink)'),
        border: '1px solid var(--hairline)',
        fontSize: m.hidden ? 10.5 : 13.5,
        lineHeight: 1.45,
        whiteSpace: m.from === 'me' ? 'pre-wrap' : 'normal',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        fontFamily: m.hidden ? 'var(--font-mono)' : undefined,
        position: 'relative',
        userSelect: 'text',
        WebkitUserSelect: 'text',
      }}>
        {canCopy && (
          <button
            type="button"
            title={copied ? 'Copied' : 'Copy message'}
            onClick={() => onCopy(m, index)}
            style={{
              all: 'unset',
              cursor: 'pointer',
              position: 'absolute',
              top: 6,
              right: 7,
              width: 20,
              height: 20,
              borderRadius: 6,
              display: 'grid',
              placeItems: 'center',
              color: copied ? 'var(--accent-ink)' : 'var(--ink-faint)',
              background: copied ? 'var(--accent-soft)' : 'transparent',
            }}
          >
            {copied ? <Icon.Check size={12} /> : <Icon.Copy size={12} />}
          </button>
        )}
        {m.image && <img src={m.image} alt="attached" style={{ width: '100%', borderRadius: 6, background: 'var(--surface)', border: '1px solid var(--hairline)', userSelect: 'none' }} />}
        <div style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>
          {m.from === 'me' ? m.text : renderMarkdown(m.text, { compact: true })}
        </div>
        {m.from !== 'me' && m.activity && <ActivityStrip activity={m.activity} />}
      </div>
    </div>
  );
}

function fmtMs(ms) {
  if (!Number.isFinite(ms)) return 'n/a';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(ms < 10000 ? 1 : 0)}s`;
}

function ActivityStrip({ activity }) {
  const [open, setOpen] = React.useState(false);
  const hasTools = activity.tools?.length > 0;
  return (
    <div style={{ marginTop: 4, borderTop: '1px dashed var(--hairline)', paddingTop: 7 }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{ all: 'unset', cursor: 'pointer', display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-faint)' }}
      >
        <span style={{ color: 'var(--accent-ink)', fontWeight: 700 }}>{hasTools ? 'tool activity' : 'response timing'}</span>
        <span>total {fmtMs(activity.totalMs)}</span>
        <span>model {fmtMs(activity.modelMs)}</span>
        {hasTools && <span>tools {fmtMs(activity.toolMs)}</span>}
        {activity.rounds > 0 && <span>{activity.rounds} model call{activity.rounds === 1 ? '' : 's'}</span>}
        <span>{open ? 'hide' : 'details'}</span>
      </button>
      {open && (
        <div style={{ marginTop: 7, display: 'grid', gap: 6 }}>
          {activity.tools?.map((tool, i) => (
            <div key={`${tool.name}-${i}`} style={{ border: '1px solid var(--hairline)', borderRadius: 8, background: 'var(--surface)', padding: '7px 8px', display: 'grid', gap: 4 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: 10 }}>
                <span style={{ color: 'var(--accent-ink)', fontWeight: 800 }}>{tool.name}</span>
                <span style={{ color: 'var(--ink-faint)' }}>{fmtMs(tool.ms)}</span>
                {Number.isFinite(tool.resultChars) && <span style={{ color: 'var(--ink-faint)' }}>{tool.resultChars.toLocaleString()} chars</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
