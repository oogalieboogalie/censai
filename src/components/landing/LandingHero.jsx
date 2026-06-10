import React from 'react';
import { motion } from 'framer-motion';
import { RoadmapTimeline } from '../RoadmapTimeline.jsx';
import { CYCLING_TERMS } from './landingModel.js';

export function LandingHero({ onStart, onSkip }) {
  const [wordIndex, setWordIndex] = React.useState(0);
  React.useEffect(() => {
    const timer = window.setInterval(() => {
      setWordIndex((current) => (current + 1) % CYCLING_TERMS.length);
    }, 2200);
    return () => window.clearInterval(timer);
  }, []);

  const CyclingWord = () => (
    <span
      style={{
        position: 'relative',
        display: 'inline-grid',
        height: '1.12em',
        width: '12.8ch',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderRadius: 12,
        padding: '0 0.22em',
        background: 'linear-gradient(180deg, oklch(1 0 0 / 0.72), var(--surface-2))',
        border: '1px solid var(--hairline-strong)',
        boxShadow: '0 1px 0 oklch(1 0 0 / 0.8) inset, 0 10px 22px -18px oklch(0 0 0 / 0.28)',
        verticalAlign: '-0.08em',
        contain: 'layout paint',
      }}
    >
      <AnimatePresence mode="popLayout">
        <motion.span
          key={CYCLING_TERMS[wordIndex]}
          initial={{ y: 42, opacity: 0, rotateX: -72, filter: 'blur(5px)' }}
          animate={{
            y: [42, -7, 3, 0],
            opacity: [0, 1, 1, 1],
            rotateX: [-72, 9, -3, 0],
            filter: ['blur(5px)', 'blur(0px)', 'blur(0px)', 'blur(0px)'],
          }}
          exit={{ y: -42, opacity: 0, rotateX: 54, filter: 'blur(5px)' }}
          transition={{
            y: { duration: 0.52, times: [0, 0.72, 0.9, 1], ease: ['easeOut', 'easeInOut', 'easeOut'] },
            rotateX: { duration: 0.52, times: [0, 0.72, 0.9, 1], ease: ['easeOut', 'easeInOut', 'easeOut'] },
            opacity: { duration: 0.18, ease: 'linear' },
            filter: { duration: 0.28, ease: 'easeOut' },
          }}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            whiteSpace: 'nowrap',
            textAlign: 'center',
            transformOrigin: 'center center',
            willChange: 'transform, opacity, filter',
            lineHeight: 1,
          }}
        >
          {CYCLING_TERMS[wordIndex]}
        </motion.span>
      </AnimatePresence>
    </span>
  );

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      '--ink': 'oklch(0.16 0.008 260)',
      '--ink-soft': 'oklch(0.38 0.008 260)',
      '--ink-faint': 'oklch(0.58 0.006 260)',
      '--surface': 'oklch(0.995 0 0)',
      '--surface-2': 'oklch(0.96 0.004 260)',
      '--hairline': 'oklch(0.86 0.006 260)',
      '--hairline-strong': 'oklch(0.70 0.008 260)',
      '--accent': 'oklch(0.48 0.20 25)',
      '--accent-ink': 'oklch(0.42 0.16 25)',
      display: 'grid', placeItems: 'center',
      background: 'radial-gradient(circle at center, oklch(0.48 0.20 25 / 0.08) 0%, oklch(0.95 0.004 260 / 0.72) 58%, oklch(0.12 0.006 260 / 0.22) 100%)',
      backdropFilter: 'blur(4px) saturate(1.1)',
      animation: 'hero-in 0.6s ease both',
    }}>
      <style>{`
        @keyframes hero-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes hero-out { from { opacity: 1; transform: scale(1) } to { opacity: 0; transform: scale(0.98) } }
        @keyframes shimmer { 0%,100% { opacity: 0.5 } 50% { opacity: 1 } }
        @media (max-width: 640px) {
          .landing-hero-card { width: calc(100vw - 28px) !important; padding: 34px 24px !important; border-radius: 22px !important; }
          .landing-hero-title { font-size: clamp(34px, 9vw, 44px) !important; }
          .landing-hero-copy { font-size: 14px !important; }
          .landing-brand-logo { width: min(116px, 34vw) !important; }
        }
        @media (max-height: 760px) {
          .landing-hero-card { padding-top: 28px !important; padding-bottom: 22px !important; }
          .landing-hero-title { font-size: clamp(34px, 7vh, 42px) !important; margin-bottom: 12px !important; }
          .landing-hero-copy { margin-bottom: 14px !important; line-height: 1.45 !important; }
          .landing-brand-logo { width: min(104px, 30vw) !important; margin-bottom: 14px !important; }
          .landing-beta-note, .landing-demo-note { display: none !important; }
        }
        @media (max-height: 620px) {
          .landing-hero-card { padding-top: 22px !important; padding-bottom: 18px !important; }
          .landing-hero-title { font-size: clamp(32px, 6.4vh, 38px) !important; }
          .landing-brand-logo { width: min(92px, 28vw) !important; margin-bottom: 10px !important; }
        }
      `}</style>
      <div className="landing-hero-card" style={{
        textAlign: 'center', width: 'min(640px, calc(100vw - 32px))',
        background: 'var(--surface)', border: '1px solid var(--hairline)',
        borderRadius: 26, padding: '34px 52px 28px',
        boxShadow: '0 1px 0 oklch(1 0 0 / 0.75) inset, 0 18px 60px -32px oklch(0 0 0 / 0.34)',
      }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', animation: 'shimmer 1.6s ease-in-out infinite' }} />
          Private Beta
        </div>
        <img
          className="landing-brand-logo"
          src="/assets/app-icon-512.png"
          alt="Censai Hub"
          style={{
            display: 'block',
            width: 'min(132px, 34vw)',
            height: 'auto',
            margin: '0 auto 18px',
            borderRadius: 24,
            border: '1px solid oklch(0.88 0.006 260)',
            boxShadow: '0 16px 38px -26px oklch(0 0 0 / 0.34)',
          }}
        />
        <div className="landing-hero-title" style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 600, lineHeight: 1.04, letterSpacing: '-0.015em', color: 'var(--ink)', marginBottom: 18 }}>
          Censai Hub,
          <span style={{ display: 'block', fontSize: '0.82em', lineHeight: 1.05, marginTop: 4, color: 'var(--ink-soft)' }}>the</span>
          <span style={{ display: 'block', lineHeight: 1.12, margin: '2px 0 4px' }}><CyclingWord /></span>
          <span style={{ display: 'block' }}>workspace.</span>
        </div>
        <div className="landing-hero-copy" style={{ fontSize: 15.5, lineHeight: 1.62, color: 'var(--ink-soft)', maxWidth: 520, margin: '0 auto 22px' }}>
          One visual room where your projects, files, agents, tasks, notes, and
          generated artifacts stay connected.
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 28 }}>
          <button onClick={onStart} style={{
            all: 'unset', cursor: 'pointer',
            background: 'var(--accent)', color: 'white',
            padding: '12px 24px', borderRadius: 999,
            fontWeight: 600, fontSize: 14,
            boxShadow: '0 4px 16px oklch(0.48 0.20 25 / 0.32), 0 1px 0 oklch(1 0 0 / 0.3) inset',
            display: 'inline-flex', alignItems: 'center', gap: 8,
            transition: 'transform 0.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            Try the canvas
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
          </button>
          <button onClick={onSkip} style={{
            all: 'unset', cursor: 'pointer',
            color: 'var(--ink-soft)',
            padding: '12px 18px', borderRadius: 999,
            fontWeight: 500, fontSize: 14,
            transition: 'color 0.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--ink)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--ink-soft)'}
          >
            Skip to waitlist
          </button>
        </div>
        <div className="landing-beta-note" style={{ marginTop: 18, fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-soft)', maxWidth: 520, marginLeft: 'auto', marginRight: 'auto' }}>
          Same canvas. Different workdays.
          Private beta is capped at 50 early users so I can support the first group well.
        </div>
        <div className="landing-demo-note" style={{ marginTop: 16, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-faint)', letterSpacing: '0.08em' }}>
          live demo · no signup needed · drag, draw, spawn
        </div>
      </div>
    </div>
  );
}


