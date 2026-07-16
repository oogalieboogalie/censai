import React from 'react';
import { Icon } from './Icons.jsx';
import { WindowTitle } from './Windows.jsx';
import { ThemeWorkbenchPreview } from './theme/ThemePreview.jsx';
import { AccentSection, MoodSection, SavedPresetsSection } from './theme/ThemeDesignSections.jsx';
import { FineTuneSection, WorkspaceSection } from './theme/ThemeWorkspaceSection.jsx';
import { VaultSection } from './theme/VaultSection.jsx';
import { useThemePanel } from './theme/useThemePanel.js';
import { useWorkspaceStore } from '../lib/store.js';
import { api } from '../lib/api.js';

export function AppearanceWindow({ win, onUpdate }) {
  const {
    theme, setTheme, tab, setTab, moodsExpanded, setMoodsExpanded,
    customPresets, savingPreset, setSavingPreset, presetName, setPresetName,
    activeSurface, setActiveSurface, previewPct, panelRef, tabs,
    resetTheme, clearOverrides, applyMoodPreset, randomizeTheme,
    saveCurrentPreset, applyCustomPreset, deleteCustomPreset,
    startDividerDrag,
  } = useThemePanel();

  const { focusMode, setFocusMode, penMode, setPenMode } = useWorkspaceStore();

  const onResetWorkspace = () => {
    if (confirm('Clear all windows + designed agents?')) {
      api.resetWorkspace().finally(() => location.reload());
    }
  };

  const onLogout = async () => {
    if (confirm('Log out from Censai?')) {
      await api.logout();
      window.location.reload();
    }
  };

  return (
    <>
      <WindowTitle
        accent="var(--accent)"
        icon={<Icon.Gear size={14} />}
        label={win.title || 'Appearance Settings'}
        subtitle={win.subtitle || 'Customize theme, colors, and workspace'}
      />
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--surface)', overflow: 'hidden' }}>
        {/* Tab Selector */}
        <div style={{ display: 'flex', gap: 6, padding: '10px 16px', borderBottom: '1px solid var(--hairline)', background: 'var(--surface-2)' }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                all: 'unset',
                cursor: 'pointer',
                padding: '6px 12px',
                borderRadius: 7,
                fontSize: 12,
                fontWeight: 650,
                color: tab === t.id ? 'var(--accent-ink)' : 'var(--ink-soft)',
                background: tab === t.id ? 'var(--accent-soft)' : 'transparent',
                transition: 'background 0.15s, color 0.15s'
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, minHeight: 0, padding: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {tab === 'appearance' && (
            <div ref={panelRef} style={{ display: 'grid', gridTemplateColumns: `${previewPct}% 10px minmax(330px, 1fr)`, gap: 12, flex: 1, minHeight: 0, height: '100%' }}>
              <ThemeWorkbenchPreview activeSurface={activeSurface} setActiveSurface={setActiveSurface} />
              <div onPointerDown={startDividerDrag} title="Drag to resize preview" style={{ cursor: 'col-resize', borderRadius: 999, background: 'linear-gradient(180deg, transparent, var(--hairline-strong), transparent)', display: 'grid', placeItems: 'center' }}>
                <div style={{ width: 4, height: 42, borderRadius: 999, background: 'var(--accent)' }} />
              </div>
              <div style={{ overflowY: 'auto', paddingRight: 6, display: 'grid', gap: 14, alignContent: 'start', minWidth: 0, height: '100%', minHeight: 0 }}>
                <AccentSection theme={theme} setTheme={setTheme} />
                <MoodSection theme={theme} resetTheme={resetTheme} randomizeTheme={randomizeTheme} applyMoodPreset={applyMoodPreset} moodsExpanded={moodsExpanded} setMoodsExpanded={setMoodsExpanded} />
                <SavedPresetsSection theme={theme} customPresets={customPresets} applyCustomPreset={applyCustomPreset} deleteCustomPreset={deleteCustomPreset} savingPreset={savingPreset} setSavingPreset={setSavingPreset} presetName={presetName} setPresetName={setPresetName} saveCurrentPreset={saveCurrentPreset} />
                <FineTuneSection theme={theme} setTheme={setTheme} clearOverrides={clearOverrides} activeSurface={activeSurface} setActiveSurface={setActiveSurface} />
              </div>
            </div>
          )}
          {tab === 'workspace' && (
            <div style={{ overflowY: 'auto', flex: 1 }}>
              <WorkspaceSection focusMode={focusMode} setFocusMode={setFocusMode} penMode={penMode} setPenMode={setPenMode} onResetWorkspace={onResetWorkspace} onLogout={onLogout} />
            </div>
          )}
          {tab === 'vault' && (
            <div style={{ overflowY: 'auto', flex: 1 }}>
              <VaultSection />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default AppearanceWindow;
