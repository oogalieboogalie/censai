import React from 'react';
import { AgentAvatar } from '../Agents.jsx';
import { getAgentById } from '../../lib/agentStore.js';

export function WindowTitle({ icon, label, accent, subtitle, agent, attachedAgentIds, onDetach, children }) {
  const attached = (attachedAgentIds || []).map(id => getAgentById(id)).filter(Boolean);
  const bgStyle = {
    background: accent ? `color-mix(in oklab, ${accent} 8%, transparent)` : 'var(--window-title-bg, transparent)',
    backdropFilter: 'var(--window-title-backdrop, none)',
    WebkitBackdropFilter: 'var(--window-title-backdrop, none)',
  };
  return (
    <div style={{ ...bgStyle, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 64px 8px 72px', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-soft)', borderBottom: '1px dashed var(--hairline)', flexShrink: 0, position: 'relative', zIndex: 4, pointerEvents: 'none' }}>
      {agent && <div style={{ pointerEvents: 'auto' }}><AgentAvatar agent={agent} size={18} /></div>}
      {icon && !agent && <span style={{ color: accent || 'var(--accent-ink)' }}>{icon}</span>}
      <span style={{ pointerEvents: 'none' }}>{label}</span>
      {subtitle && <span style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--ink-faint)', fontWeight: 400, pointerEvents: 'none' }}>&nbsp;· {subtitle}</span>}
      <div style={{ flex: 1 }} />
      {attached.length > 0 && <div style={{ display: 'flex', gap: 4, pointerEvents: 'auto' }}>
        {attached.map(a => <div key={a.id} title={`${a.name} attached — click to detach`} onClick={(e) => { e.stopPropagation(); onDetach?.(a.id); }} style={{ cursor: 'pointer' }}><AgentAvatar agent={a} size={18} ring /></div>)}
      </div>}
      {children && <div style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>{children}</div>}
    </div>
  );
}

