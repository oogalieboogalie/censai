import React from 'react';
import { Icon } from '../Icons.jsx';

export function Tour({ step, onDismiss, onWaitlist }) {
  if (step === 0) return null;

  const content = {
    1: {
      eyebrow: 'try this',
      title: 'Left-click and drag anywhere on the canvas',
      body: 'You\'ll mark a region — that region becomes whatever you need: a chat, a todo list, an idea pad, a workflow…',
      cta: null,
    },
    2: {
      eyebrow: 'nice',
      title: 'That\'s the whole motion.',
      body: 'Spawn anything, anywhere. Drag windows around, draw with the pen, group things, zoom out to see the whole project.',
      cta: null,
    },
    3: {
      eyebrow: 'private beta',
      title: 'Want the full thing?',
      body: 'Agents on a side rail, persistent memory, shared workspaces, browser windows, real chat. Drop your email and you\'ll be first in.',
      cta: { label: 'Join the waitlist', onClick: onWaitlist },
    },
  }[step];

  if (!content) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 96, left: '50%', transform: 'translateX(-50%)',
      maxWidth: 420, zIndex: 80,
      animation: 'tour-in 0.35s cubic-bezier(0.2, 0.8, 0.2, 1) both',
      pointerEvents: 'auto',
    }}>
      <style>{`@keyframes tour-in { from { opacity: 0; transform: translateX(-50%) translateY(8px) } to { opacity: 1; transform: translateX(-50%) translateY(0) } }`}</style>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--hairline)',
        borderRadius: 16, padding: '14px 18px',
        boxShadow: 'var(--shadow-pop)',
        display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--accent-ink)' }}>
            {content.eyebrow}
          </div>
          <button onClick={onDismiss} title="Dismiss" style={{ all: 'unset', cursor: 'pointer', color: 'var(--ink-faint)', display: 'flex' }}>
            <Icon.Close size={12} />
          </button>
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, color: 'var(--ink)', letterSpacing: '-0.01em', lineHeight: 1.25 }}>
          {content.title}
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--ink-soft)' }}>
          {content.body}
        </div>
        {content.cta && (
          <button onClick={content.cta.onClick} style={{
            all: 'unset', cursor: 'pointer',
            marginTop: 8, alignSelf: 'flex-start',
            background: 'var(--accent)', color: 'white',
            padding: '8px 16px', borderRadius: 999,
            fontWeight: 600, fontSize: 13,
            boxShadow: '0 2px 8px oklch(var(--accent-l) calc(var(--accent-c) * 0.8) var(--accent-h) / 0.35)',
          }}>{content.cta.label} →</button>
        )}
      </div>
    </div>
  );
}


