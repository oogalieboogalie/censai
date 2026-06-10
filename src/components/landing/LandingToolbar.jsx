import React from 'react';
import { Icon } from '../Icons.jsx';

export function Toolbar({ activeTool, onSelectTool, penColor, setPenColor, penSize, setPenSize }) {
  const tools = [
    { id: 'select', label: 'Select', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/></svg> },
    { id: 'pen', label: 'Draw', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg> },
    { id: 'eraser', label: 'Erase', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20H7L3 16C2.5 15.5 2.5 14.5 3 14L13 4C13.5 3.5 14.5 3.5 15 4L20 9C20.5 9.5 20.5 10.5 20 11L11 20H20V20Z"/></svg> },
  ];
  const colors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#FFFFFF'];
  const sizes = [2, 4, 8];

  return (
    <div style={{
      position: 'fixed', bottom: 40, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', gap: 6, padding: 6, alignItems: 'center',
      background: 'var(--surface)', border: '1px solid var(--hairline)',
      borderRadius: 16, boxShadow: 'var(--shadow-card)',
      zIndex: 50, pointerEvents: 'auto',
    }}>
      {tools.map(t => (
        <button key={t.id} onClick={() => onSelectTool(t.id)} title={t.label} style={{
          all: 'unset', cursor: 'pointer',
          width: 36, height: 36, borderRadius: 10,
          display: 'grid', placeItems: 'center',
          color: activeTool === t.id ? 'var(--accent-ink)' : 'var(--ink-soft)',
          background: activeTool === t.id ? 'var(--accent-soft)' : 'transparent',
          transition: 'background 0.2s, color 0.2s',
        }}>{t.icon}</button>
      ))}

      {activeTool === 'pen' && (
        <>
          <div style={{ width: 1, height: 24, background: 'var(--hairline)', margin: '0 4px' }} />
          <div style={{ display: 'flex', gap: 4 }}>
            {colors.map(c => (
              <button key={c} onClick={() => setPenColor(c)} title={c} style={{
                all: 'unset', cursor: 'pointer',
                width: 24, height: 24, borderRadius: '50%',
                background: c,
                border: penColor === c ? '2px solid white' : '2px solid transparent',
                boxShadow: penColor === c ? '0 0 0 1px var(--ink-soft)' : 'none',
                transform: penColor === c ? 'scale(1.1)' : 'scale(1)',
                transition: 'transform 0.1s',
              }} />
            ))}
          </div>
          <div style={{ width: 1, height: 24, background: 'var(--hairline)', margin: '0 4px' }} />
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {sizes.map(s => (
              <button key={s} onClick={() => setPenSize(s)} title={`${s}px`} style={{
                all: 'unset', cursor: 'pointer',
                width: 24, height: 24, borderRadius: 6,
                display: 'grid', placeItems: 'center',
                background: penSize === s ? 'var(--surface-2)' : 'transparent',
              }}>
                <div style={{ width: s, height: s, borderRadius: '50%', background: 'var(--ink)' }} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}


