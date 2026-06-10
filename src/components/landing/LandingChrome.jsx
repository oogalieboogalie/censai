import React from 'react';

export function LandingChrome({ onJoinClick }) {
  return (
    <div style={{
      position: 'fixed', top: 14, left: 18, right: 18, height: 44,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      pointerEvents: 'none', zIndex: 30,
    }}>
      <a href="/" title="Censai Hub" style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
        <img src="/assets/app-icon-64.png" alt="Censai Hub Logo" style={{ height: 28, width: 28 }} />
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, letterSpacing: '-0.01em', color: 'oklch(0.16 0.008 260)' }}>Censai Hub</div>
      </a>
      <button onClick={onJoinClick} style={{
        all: 'unset', cursor: 'pointer', pointerEvents: 'auto',
        background: 'oklch(0.48 0.20 25)', color: 'white',
        padding: '9px 18px', borderRadius: 999,
        fontWeight: 600, fontSize: 13,
        boxShadow: '0 2px 10px oklch(0.48 0.20 25 / 0.32), 0 1px 0 oklch(1 0 0 / 0.3) inset',
        transition: 'transform 0.15s',
      }}
        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
      >Sign-up →</button>
    </div>
  );
}


