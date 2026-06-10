import React from 'react';
import { Icon } from './Icons.jsx';
import { WindowMenu } from './topbar/WindowMenu.jsx';
import { ToolBtn, PSButton } from './chrome/Buttons.jsx';
import { FileMenu } from './chrome/FileMenu.jsx';

export function Chrome({ 
  onNewAgent, onNewWindow, onNewWorkflow, onNewTerminal, onNewHtmlPreview, 
  onSpawnRook, onNewMailcow, onNewVex, onSpawn, onToggleFocus, 
  focusMode, penMode = false, onTogglePenMode, projectName, currentProject, 
  onOpenLocalProject, onOpenSettings, onMin, onMax, onClose, presets = [], 
  onSaveAsPreset, onLoadPreset, onDeletePreset 
}) {
  const [idle, setIdle] = React.useState(false);
  const [folded, setFolded] = React.useState(false);
  const [showFiles, setShowFiles] = React.useState(false);
  const idleTimer = React.useRef(null);

  React.useEffect(() => {
    const wake = () => { setIdle(false); clearTimeout(idleTimer.current); idleTimer.current = setTimeout(() => setIdle(true), 4000); };
    wake();
    window.addEventListener('mousemove', wake); window.addEventListener('keydown', wake);
    return () => { window.removeEventListener('mousemove', wake); window.removeEventListener('keydown', wake); clearTimeout(idleTimer.current); };
  }, []);

  const fade = idle || focusMode;

  return (
    <>
      <div style={{ position: 'fixed', top: 0, left: '50%', transform: `translateX(-50%) translateY(${folded ? '-100%' : '0'})`, transition: 'transform 0.4s cubic-bezier(.4,.0,.2,1), opacity 0.4s', opacity: fade ? 0 : 1, zIndex: 50 }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = 1; }} onMouseLeave={(e) => { if (fade) e.currentTarget.style.opacity = 0; }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', borderTop: 'none', borderTopLeftRadius: 0, borderTopRightRadius: 0, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, padding: '8px 22px 10px', boxShadow: 'var(--shadow-card)', display: 'flex', alignItems: 'center', gap: 14, minWidth: 320 }}>
          <img src="/assets/app-icon-64.png" alt="Censai Hub Logo" style={{ height: 24, width: 24, borderRadius: 4 }} />
          <button title="File menu" onClick={() => setShowFiles(s => !s)} style={{ all: 'unset', cursor: 'pointer', width: 26, height: 26, borderRadius: 8, display: 'grid', placeItems: 'center', color: 'var(--ink-soft)', background: showFiles ? 'var(--surface-2)' : 'transparent' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M3 4h10M3 8h10M3 12h10"/></svg>
          </button>
          <div style={{ width: 1, height: 18, background: 'var(--hairline)' }} />
          <ToolBtn onClick={onNewAgent} label="New agent" icon={<Icon.NewAgent size={18}/>} accent="var(--ps-pink)" />
          <ToolBtn onClick={onNewWindow} label="New window" icon={<Icon.NewWindow size={18}/>} accent="var(--ps-blue)" />
          <ToolBtn onClick={onNewWorkflow} label="New workflow" icon={<Icon.NewWorkflow size={18}/>} accent="var(--ps-green)" />
          <ToolBtn onClick={onNewTerminal} label="Terminal" icon={<Icon.Terminal size={18}/>} accent="var(--ps-green)" />
          <ToolBtn onClick={onNewHtmlPreview} label="HTML preview" icon={<Icon.Eye size={18}/>} accent="var(--ps-green)" />
          <ToolBtn onClick={onNewVex} label="Vex Orchestrator" icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          } accent="#a855f7" />
          <div style={{ width: 1, height: 18, background: 'var(--hairline)' }} />
          <WindowMenu onSpawn={onSpawn} />
          <div style={{ width: 1, height: 18, background: 'var(--hairline)' }} />
          <button title="Fold toolbar" onClick={() => setFolded(true)} style={{ all: 'unset', cursor: 'pointer', width: 26, height: 26, borderRadius: 8, display: 'grid', placeItems: 'center', color: 'var(--ink-soft)' }}><Icon.Up size={16}/></button>
        </div>
        {showFiles && <FileMenu onClose={() => setShowFiles(false)} projectName={projectName}
          currentProject={currentProject}
          onOpenLocalProject={onOpenLocalProject}
          presets={presets}
          onSaveAsPreset={onSaveAsPreset}
          onLoadPreset={onLoadPreset}
          onDeletePreset={onDeletePreset}
          onNewTerminal={onNewTerminal}
          onNewHtmlPreview={onNewHtmlPreview}
          onSpawnRook={onSpawnRook}
          onNewMailcow={onNewMailcow}
          onNewVex={onNewVex}
        />}
      </div>
      {folded && <div style={{ position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)', zIndex: 50, opacity: idle && !focusMode ? 0.3 : 1, transition: 'opacity 0.3s' }}>
        <button onClick={() => setFolded(false)} title="Show toolbar" style={{ all: 'unset', cursor: 'pointer', padding: '4px 14px 5px', background: 'var(--surface)', border: '1px solid var(--hairline)', borderTop: 'none', borderBottomLeftRadius: 14, borderBottomRightRadius: 14, boxShadow: 'var(--shadow-card)', color: 'var(--ink-faint)' }}><Icon.Down size={14}/></button>
      </div>}
      <div style={{ position: 'fixed', top: 0, right: 0, zIndex: 50, opacity: fade ? 0 : 1, transition: 'opacity 0.4s' }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = 1; }} onMouseLeave={(e) => { if (fade) e.currentTarget.style.opacity = 0; }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', borderTop: 'none', borderRight: 'none', borderBottomLeftRadius: 18, padding: '8px 12px', boxShadow: 'var(--shadow-card)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={onOpenSettings} title="Settings" style={{ all: 'unset', cursor: 'pointer', width: 26, height: 26, borderRadius: 8, display: 'grid', placeItems: 'center', color: 'var(--ink-soft)' }}><Icon.Gear size={16} /></button>
          <button
            onClick={onTogglePenMode}
            title={penMode ? 'Disable pen mode' : 'Enable pen mode'}
            style={{
              all: 'unset',
              cursor: 'pointer',
              width: 26,
              height: 26,
              borderRadius: 8,
              display: 'grid',
              placeItems: 'center',
              color: penMode ? 'var(--accent-ink)' : 'var(--ink-soft)',
              background: penMode ? 'var(--accent-soft)' : 'transparent',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </button>
          <div style={{ width: 1, height: 18, background: 'var(--hairline)' }} />
          <PSButton color="var(--ps-green)" title="Minimize" onClick={onMin}><Icon.Minimize size={11} stroke={2.4}/></PSButton>
          <PSButton color="var(--ps-blue)" title={focusMode ? 'Exit focus' : 'Focus mode'} onClick={onToggleFocus}>{focusMode ? <Icon.Eye size={10}/> : <Icon.Maximize size={10} stroke={2.2}/>}</PSButton>
          <PSButton color="var(--ps-red)" title="Close" onClick={onClose}><Icon.Close size={10} stroke={2.4}/></PSButton>
        </div>
      </div>
      {projectName && <div style={{ position: 'fixed', top: 14, left: 0, right: 0, textAlign: 'center', pointerEvents: 'none', zIndex: 5, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--ink-faint)', opacity: 0.55 }}>{projectName}</div>}
    </>
  );
}
