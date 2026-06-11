import React from 'react';
import { Icon } from '../Icons.jsx';
import { DEFAULT_HTML_PREVIEW } from './CanvasState.js';
import { LAUNCHER_MANIFESTS } from '../../lib/windowManifest.js';

// Launcher tiles are declared in the window manifest (`launcher` block) and
// rendered from LAUNCHER_MANIFESTS — adding a tile is a manifest edit, never a
// hand-written button here (window:validate enforces this). Icons resolve by
// name from the Icon set; SPECIAL_LAUNCHER_ICONS covers the few inline SVGs not
// in that set. PROP_AUGMENTERS injects UI-module constants (e.g. sample HTML)
// that cannot live in the framework-free manifest.
const SPECIAL_LAUNCHER_ICONS = {
  schedulerClock: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
  ),
};

function launcherIcon(name) {
  if (name && SPECIAL_LAUNCHER_ICONS[name]) return SPECIAL_LAUNCHER_ICONS[name];
  const Cmp = name && Icon[name];
  return Cmp ? <Cmp size={16} /> : <Icon.NewWindow size={16} />;
}

const PROP_AUGMENTERS = {
  htmlPreview: (props) => ({ ...props, html: DEFAULT_HTML_PREVIEW }),
};

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
          src="/assets/app-icon-512.png"
          alt="Censai"
          style={{
            display: 'block',
            width: 108,
            height: 108,
            margin: '0 auto 22px',
            borderRadius: 22,
            border: '1px solid var(--hairline-strong)',
            boxShadow: '0 12px 36px -12px oklch(0 0 0 / 0.16), 0 1px 0 oklch(1 0 0 / 0.8) inset',
            filter: 'drop-shadow(0 4px 20px oklch(0 0 0 / 0.05))',
            transition: 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            cursor: 'pointer',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-6px) scale(1.06) rotate(3deg)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0) scale(1) rotate(0deg)'}
        />
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 18 }}>· Censai ·</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 44, fontWeight: 600, lineHeight: 1.05, color: 'var(--ink)', letterSpacing: '-0.02em', marginBottom: 14 }}>An infinite canvas<br/>for you and your agents.</div>
        <div style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.55, maxWidth: 380, margin: '0 auto 28px' }}>Spin up a window, drag an agent in from the pink rail on the right, and design the work around the project — not the other way around.</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          {LAUNCHER_MANIFESTS.map((m) => {
            const L = m.launcher;
            const base = L.props || {};
            const props = PROP_AUGMENTERS[m.kind] ? PROP_AUGMENTERS[m.kind](base) : base;
            const handleClick = () => (L.sizeOverride
              ? onSpawn(m.kind, props, null, L.sizeOverride)
              : onSpawn(m.kind, props));
            return (
              <BigSpawn
                key={m.kind}
                onClick={handleClick}
                icon={launcherIcon(L.icon)}
                label={L.label || m.label}
                hint={L.hint}
              />
            );
          })}
        </div>
        <div style={{ marginTop: 32, fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>Ctrl+N new agent   ·   Ctrl+W new window   ·   scroll to pan   ·   Ctrl+scroll to zoom</div>
      </div>
    </div>
  );
}

function BigSpawn({ onClick, icon, label, hint }) {
  return <button onClick={onClick} style={{ all: 'unset', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '10px 14px', borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--hairline)', boxShadow: 'var(--shadow-card)', minWidth: 130, transition: 'transform 0.15s, border-color 0.15s' }}
    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.borderColor = 'oklch(var(--accent-l) calc(var(--accent-c) * 0.5) var(--accent-h))'; }}
    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--hairline)'; }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-ink)', marginBottom: 6 }}>{icon}<span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{label}</span></div>
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-faint)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{hint}</span>
  </button>;
}
