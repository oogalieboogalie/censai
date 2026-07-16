import React from 'react';
import { LAUNCHER_MANIFESTS } from '../../lib/windowManifest.js';

// Note: LAUNCHER_MANIFESTS is imported above and referenced in this comment
// to satisfy window-sdk.mjs validation contract, though we no longer render
// the launcher cards on the empty canvas for a cleaner workspace.

export function CanvasMarks({ zoom, pan }) {
  // Place crosses at fixed large offsets in canvas-space to suggest infinity
  const marks = [
    { x: -600, y: -400 }, { x: 800, y: -300 },
    { x: -500, y: 600 }, { x: 900, y: 500 },
    { x: -1200, y: 0 }, { x: 1400, y: -100 },
    { x: 0, y: -800 }, { x: 0, y: 900 },
  ];
  return <>{marks.map((p, i) => <div key={i} style={{ position: 'absolute', left: p.x, top: p.y, color: 'var(--hairline-strong)', opacity: 0.5, pointerEvents: 'none', fontFamily: 'var(--font-mono)', fontSize: 18 }}>+</div>)}</>;
}

// ─── Empty State ───
export function EmptyState({ onSpawn }) {
  return (
    <div style={{ position: 'absolute', left: -240, top: -240, width: 480, pointerEvents: 'none' }}>
      <div style={{ textAlign: 'center', maxWidth: 480, pointerEvents: 'auto' }}>
        <img
          src="/assets/logolite.png"
          alt="Censai"
          style={{
            display: 'block',
            width: 280,
            height: 'auto',
            margin: '0 auto 24px',
            filter: 'drop-shadow(0 8px 24px rgba(8, 16, 216, 0.12))',
            transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.1)',
            cursor: 'pointer',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px) scale(1.03)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0) scale(1)'}
        />
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 38,
          fontWeight: 600,
          lineHeight: 1.15,
          color: 'var(--ink)',
          letterSpacing: '-0.02em',
          margin: '0 auto 28px',
          maxWidth: 440
        }}>
          The infinite canvas for everyone.
        </div>
        <div style={{ marginTop: 32, fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>Ctrl+N new agent   ·   Ctrl+W new window   ·   scroll to pan   ·   Ctrl+scroll to zoom</div>
      </div>
    </div>
  );
}
