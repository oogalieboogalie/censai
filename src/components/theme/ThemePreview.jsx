import React from 'react';
import { Icon } from '../Icons.jsx';
import { SURFACE_CONTROLS } from '../Theme.jsx';

export function previewRing(activeSurface, key) {
  return activeSurface === key
    ? '0 0 0 3px var(--accent), 0 18px 36px -26px var(--accent)'
    : '0 0 0 1px var(--hairline)';
}

export function ThemeWorkbenchPreview({ activeSurface, setActiveSurface }) {
  const label = SURFACE_CONTROLS.find(item => item.previewKey === activeSurface)?.label || 'Preview';
  const previewItem = (key, labelText, extra = {}) => ({
    onMouseEnter: () => setActiveSurface?.(key),
    onClick: () => setActiveSurface?.(key),
    style: {
      cursor: 'pointer',
      transition: 'box-shadow 0.15s, transform 0.15s',
      boxShadow: previewRing(activeSurface, key),
      transform: activeSurface === key ? 'translateY(-1px)' : 'none',
      ...extra,
    },
    title: labelText,
  });

  return (
    <section
      {...previewItem('bg', 'App Backdrop')}
      style={{
        ...previewItem('bg', 'App Backdrop').style,
        position: 'relative',
        height: '100%',
        minHeight: 500,
        borderRadius: 14,
        overflow: 'hidden',
        background: 'var(--bg)',
        border: '1px solid var(--hairline)',
      }}
    >
      <div style={{ position: 'absolute', top: 14, left: 16, zIndex: 3, display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 999, background: 'var(--surface)', border: '1px solid var(--hairline)', color: 'var(--ink)' }}>
        <Icon.Gear size={13} />
        <span style={{ fontSize: 12, fontWeight: 800 }}>Live Preview</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-faint)' }}>{label}</span>
      </div>

      <div
        {...previewItem('canvas', 'Board Canvas')}
        style={{
          ...previewItem('canvas', 'Board Canvas').style,
          position: 'absolute',
          inset: 58,
          borderRadius: 18,
          backgroundColor: 'var(--canvas)',
          backgroundImage: 'radial-gradient(var(--hairline-strong) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
          border: '1px solid var(--hairline)',
        }}
      >
        <div style={{ position: 'absolute', left: 28, top: 34, right: 240, height: 170, border: '2px dashed var(--hairline-strong)', borderRadius: 18, background: 'oklch(1 0 0 / 0.08)' }}>
          <div style={{ position: 'absolute', left: 16, top: 14, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-faint)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Canvas group</div>
        </div>

        <div
          {...previewItem('surface', 'Window Surface')}
          style={{
            ...previewItem('surface', 'Window Surface').style,
            position: 'absolute',
            left: 70,
            top: 82,
            width: 270,
            borderRadius: 'var(--window-radius)',
            background: 'var(--window-bg)',
            border: '1px solid var(--hairline)',
            color: 'var(--ink)',
            overflow: 'hidden',
          }}
        >
          <div style={{ height: 'var(--window-strip-height)', background: 'var(--window-strip-bg)' }} />
          <div style={{ padding: '11px 12px', background: 'var(--window-title-bg)', backdropFilter: 'var(--window-title-backdrop)', borderBottom: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: 99, background: 'var(--accent)' }} />
            <div style={{ fontSize: 12, fontWeight: 800 }}>Idea card</div>
          </div>
          <div style={{ padding: 14, display: 'grid', gap: 9 }}>
            <div {...previewItem('ink', 'Primary Text')} style={{ ...previewItem('ink', 'Primary Text').style, fontSize: 13, fontWeight: 750, color: 'var(--ink)', padding: 5, borderRadius: 7 }}>
              Main readable text
            </div>
            <div {...previewItem('inkSoft', 'Soft Text')} style={{ ...previewItem('inkSoft', 'Soft Text').style, fontSize: 11, color: 'var(--ink-soft)', padding: 5, borderRadius: 7 }}>
              Secondary helper copy and muted labels
            </div>
            <div
              {...previewItem('surface2', 'Soft Surface')}
              style={{
                ...previewItem('surface2', 'Soft Surface').style,
                borderRadius: 10,
                background: 'var(--surface-2)',
                border: '1px solid var(--hairline)',
                padding: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: 'var(--ink)',
              }}
            >
              <span style={{ fontSize: 11 }}>Input well</span>
              <button style={{ all: 'unset', padding: '5px 8px', borderRadius: 7, background: 'var(--accent)', color: '#fff', fontSize: 10, fontWeight: 800 }}>Action</button>
            </div>
          </div>
        </div>

        <div
          {...previewItem('hairline', 'Hairline Border')}
          style={{
            ...previewItem('hairline', 'Hairline Border').style,
            position: 'absolute',
            right: 54,
            top: 104,
            width: 150,
            height: 92,
            borderRadius: 14,
            border: '1px solid var(--hairline)',
            background: 'var(--surface)',
            padding: 12,
            color: 'var(--ink)',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 750, marginBottom: 8 }}>Borders</div>
          <div {...previewItem('hairlineStrong', 'Strong Border')} style={{ ...previewItem('hairlineStrong', 'Strong Border').style, height: 36, borderRadius: 10, border: '2px solid var(--hairline-strong)', display: 'grid', placeItems: 'center', fontSize: 10, color: 'var(--ink-soft)' }}>
            Strong outline
          </div>
        </div>

        <div style={{ position: 'absolute', left: 90, bottom: 52, right: 80, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ height: 8, flex: 1, borderRadius: 999, background: 'var(--accent)' }} />
          <div style={{ width: 42, height: 42, borderRadius: 14, background: 'var(--surface)', border: '1px solid var(--hairline)', display: 'grid', placeItems: 'center', color: 'var(--accent)' }}>
            <Icon.Plus size={18} />
          </div>
        </div>
      </div>
    </section>
  );
}

