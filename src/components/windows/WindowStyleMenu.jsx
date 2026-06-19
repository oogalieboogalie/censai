import React from 'react';
import { Icon } from '../Icons.jsx';

export function WindowStyleMenu({ win, theme, onUpdate, onClose, colorMenuRef }) {
  return (
    <div
      ref={colorMenuRef}
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        top: 34,
        right: 8,
        width: 200,
        background: 'var(--surface-2)',
        border: '1px solid var(--hairline-strong)',
        borderRadius: 8,
        boxShadow: 'var(--shadow-pop, 0 10px 25px rgba(0,0,0,0.3))',
        zIndex: 99,
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        fontFamily: 'var(--font-sans)',
        color: 'var(--ink)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-soft)' }}>
          Window Style
        </span>
        <button
          onClick={onClose}
          style={{
            all: 'unset',
            cursor: 'pointer',
            color: 'var(--ink-faint)',
            display: 'grid',
            placeItems: 'center',
            width: 16,
            height: 16,
            borderRadius: '50%',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--ink)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--ink-faint)'}
        >
          <Icon.Close size={10} />
        </button>
      </div>

      <div style={{ display: 'grid', gap: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
          <span style={{ color: 'var(--ink-soft)' }}>Accent Hue</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>
            {win.hue !== undefined ? `${win.hue}°` : 'Default'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="range"
            min="0"
            max="360"
            value={win.hue !== undefined ? win.hue : theme.hue}
            onChange={(e) => onUpdate({ hue: Number(e.target.value) })}
            style={{ flex: 1, accentColor: 'var(--accent)', cursor: 'pointer', height: 4 }}
          />
          {win.hue !== undefined && (
            <button
              onClick={() => onUpdate({ hue: undefined })}
              title="Reset to theme accent"
              style={{
                all: 'unset',
                cursor: 'pointer',
                fontSize: 9,
                padding: '2px 5px',
                borderRadius: 4,
                background: 'var(--surface)',
                border: '1px solid var(--hairline)',
                color: 'var(--ink-soft)',
                  }}
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gap: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
              <span style={{ color: 'var(--ink-soft)' }}>Transparency</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>
                {win.opacity !== undefined ? `${Math.round(win.opacity * 100)}%` : '100%'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={win.opacity !== undefined ? win.opacity : 1}
                onChange={(e) => onUpdate({ opacity: Number(e.target.value) })}
                style={{ flex: 1, accentColor: 'var(--accent)', cursor: 'pointer', height: 4 }}
              />
              {win.opacity !== undefined && win.opacity !== 1 && (
                <button
                  onClick={() => onUpdate({ opacity: undefined })}
                  title="Reset to solid background"
                  style={{
                    all: 'unset',
                    cursor: 'pointer',
                    fontSize: 9,
                    padding: '2px 5px',
                    borderRadius: 4,
                    background: 'var(--surface)',
                    border: '1px solid var(--hairline)',
                    color: 'var(--ink-soft)',
                  }}
                >
                  Solid
                </button>
              )}
            </div>
          </div>
        </div>
  );
}
