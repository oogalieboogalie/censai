import React from 'react';
import { Icon } from '../Icons.jsx';
import { WindowTitle } from '../Windows.jsx';
import { SettingsPanel } from '../windows/WindowThemePanel.jsx';

export function TerminalHeader({ win, cwd, onUpdate, showSettings, setShowSettings, handleThemeChange, theme }) {
  return (
    <>
      <WindowTitle
        accent="var(--ps-green)"
        icon={<Icon.Terminal size={14} />}
        label={win.title || 'Terminal'}
        subtitle={cwd || 'sandbox'}
        attachedAgentIds={win.attachedAgents}
        onDetach={(id) => onUpdate({ attachedAgents: (win.attachedAgents || []).filter(a => a !== id) })}
        extra={
          <button
            onClick={() => setShowSettings(!showSettings)}
            onPointerDown={(e) => e.stopPropagation()}
            title="Terminal theme settings"
            style={{
              background: showSettings ? 'rgba(96, 165, 250, 0.15)' : 'transparent',
              border: 'none',
              borderRadius: 4,
              padding: 4,
              cursor: 'pointer',
              color: showSettings ? '#60a5fa' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
          >
            <Icon.Gear size={14} />
          </button>
        }
      />
      {showSettings && (
        <SettingsPanel
          title="Terminal Theme"
          theme={theme}
          onThemeChange={handleThemeChange}
          onClose={() => setShowSettings(false)}
        />
      )}
    </>
  );
}

export function TerminalToolbar({ theme, win, currentProject, mountableProjects, mountProject, agentEnabled, onUpdate }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', background: theme.background, borderBottom: '1px solid rgba(148,163,184,0.15)' }}>
      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Mounted to</span>
      <select
        value={win.cwd || ''}
        onChange={(e) => mountProject(e.target.value)}
        onPointerDown={(e) => e.stopPropagation()}
        title="Mount this terminal to a project directory"
        style={{ flex: 1, minWidth: 0, background: '#111827', color: '#d7deea', border: '1px solid rgba(148,163,184,0.25)', borderRadius: 6, fontSize: 11, fontFamily: 'var(--font-mono)', padding: '3px 6px' }}
      >
        <option value="">{currentProject?.path ? `current project (${currentProject.name || currentProject.path})` : 'sandbox (server cwd)'}</option>
        {mountableProjects.map((p) => (
          <option key={p.path} value={p.path}>{p.name || p.path}</option>
        ))}
      </select>
      <button
        onClick={() => onUpdate?.({ agentEnabled: !agentEnabled })}
        onPointerDown={(e) => e.stopPropagation()}
        title={agentEnabled
          ? 'Attached agents can run commands in this terminal. Click to disable.'
          : 'Let attached agents run commands in this shared terminal (you watch live).'}
        style={{
          flexShrink: 0,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          background: agentEnabled ? 'rgba(52,211,153,0.15)' : '#111827',
          color: agentEnabled ? '#34d399' : '#94a3b8',
          border: `1px solid ${agentEnabled ? 'rgba(52,211,153,0.4)' : 'rgba(148,163,184,0.25)'}`,
          borderRadius: 6,
          fontSize: 10,
          fontFamily: 'var(--font-mono)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          padding: '3px 8px',
          cursor: 'pointer',
        }}
      >
        <Icon.Bot size={12} /> {agentEnabled ? 'Agent on' : 'Agent off'}
      </button>
    </div>
  );
}
