import React, { useState, useCallback, useMemo, useRef } from 'react';
import { api } from '../lib/api.js';
import { DEFAULT_THEME } from './windows/WindowThemePanel.jsx';
import { useTerminal } from './terminal/useTerminal.js';
import { TerminalHeader, TerminalToolbar } from './terminal/TerminalUI.jsx';

export function TerminalWindow({ win, onUpdate, currentProject }) {
  const hostRef = useRef(null);
  const cwd = win.cwd || currentProject?.path || '';
  const agentEnabled = Boolean(win.agentEnabled);
  const [projects, setProjects] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const theme = win.terminalTheme || { ...DEFAULT_THEME };

  const handleThemeChange = useCallback((newTheme) => {
    onUpdate({ terminalTheme: newTheme });
  }, [onUpdate]);

  React.useEffect(() => {
    let cancelled = false;
    api.getProjects()
      .then((list) => { if (!cancelled) setProjects(Array.isArray(list) ? list : []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const mountProject = (nextPath) => {
    const proj = projects.find((p) => p.path === nextPath);
    onUpdate?.({ cwd: nextPath, title: proj?.name ? `Terminal · ${proj.name}` : 'Terminal' });
  };

  const mountableProjects = useMemo(() => {
    const seen = new Set(currentProject?.path ? [currentProject.path] : []);
    return projects.filter((p) => {
      if (!p.path || seen.has(p.path)) return false;
      seen.add(p.path);
      return true;
    });
  }, [projects, currentProject?.path]);

  const { termRef } = useTerminal(hostRef, win, cwd, theme);

  React.useEffect(() => {
    if (cwd && win.cwd !== cwd) onUpdate?.({ cwd });
  }, [cwd]);

  return (
    <>
      <TerminalHeader
        win={win} cwd={cwd} onUpdate={onUpdate}
        showSettings={showSettings} setShowSettings={setShowSettings}
        handleThemeChange={handleThemeChange} theme={theme}
      />
      <TerminalToolbar
        theme={theme} win={win} currentProject={currentProject}
        mountableProjects={mountableProjects} mountProject={mountProject}
        agentEnabled={agentEnabled} onUpdate={onUpdate}
      />
      <div
        ref={hostRef}
        onPointerDown={(event) => {
          event.stopPropagation();
          if (!window.getSelection().toString()) {
            termRef.current?.focus();
          }
        }}
        style={{
          flex: 1,
          minHeight: 0,
          padding: 8,
          background: theme.background,
          overflow: 'hidden',
          cursor: 'text',
        }}
      />
    </>
  );
}
