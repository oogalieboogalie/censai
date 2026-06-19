import React from 'react';
import { Icon } from '../Icons.jsx';
import { ThemeWorkbenchPreview } from './ThemePreview.jsx';
import { AccentSection, MoodSection, SavedPresetsSection } from './ThemeDesignSections.jsx';
import { FineTuneSection, WorkspaceSection } from './ThemeWorkspaceSection.jsx';
import { VaultSection } from './VaultSection.jsx';
import { useThemePanel } from './useThemePanel.js';

export function ThemePanel({ open, onClose, anchor, focusMode, setFocusMode, penMode, setPenMode, onResetWorkspace, onLogout }) {
  const {
    theme, setTheme, tab, setTab, moodsExpanded, setMoodsExpanded,
    customPresets, savingPreset, setSavingPreset, presetName, setPresetName,
    activeSurface, setActiveSurface, previewPct, panelRef, pos, tabs,
    resetTheme, clearOverrides, applyMoodPreset, randomizeTheme,
    saveCurrentPreset, applyCustomPreset, deleteCustomPreset,
    startDividerDrag, startDrag,
  } = useThemePanel();

  if (!open) return null;

  const panelWidth = tab === 'appearance'
    ? 'min(1120px, calc(100vw - 28px))'
    : (tab === 'vault' ? 'min(520px, calc(100vw - 28px))' : 'min(430px, calc(100vw - 28px))');

  return (
    <div
      role="dialog"
      style={{
        position: 'fixed',
        top: pos ? pos.y : (anchor?.top ?? 52),
        left: pos ? pos.x : undefined,
        right: pos ? undefined : (anchor?.right ?? 18),
        width: panelWidth,
        maxHeight: 'calc(100vh - 76px)',
        display: 'flex', flexDirection: 'column', borderRadius: 10,
        background: 'var(--surface)', border: '1px solid var(--hairline)',
        boxShadow: '0 28px 70px -35px oklch(0 0 0 / 0.55), 0 0 0 1px oklch(1 0 0 / 0.04)',
        zIndex: 90, fontFamily: 'var(--font-sans)', color: 'var(--ink)', overflow: 'hidden',
      }}
    >
      <div onPointerDown={startDrag} style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--hairline)', cursor: 'grab', userSelect: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent-ink)', display: 'grid', placeItems: 'center' }}>
              <Icon.Gear size={15} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>Customize</div>
              <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Theme, colors, and workspace behavior</div>
            </div>
          </div>
          <button onClick={onClose} title="Close settings" style={{ all: 'unset', cursor: 'pointer', width: 28, height: 28, borderRadius: 7, display: 'grid', placeItems: 'center', color: 'var(--ink-faint)', background: 'var(--surface-2)' }}>
            <Icon.Close size={14} />
          </button>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ all: 'unset', cursor: 'pointer', padding: '7px 10px', borderRadius: 7, fontSize: 12, fontWeight: 650, color: tab === t.id ? 'var(--accent-ink)' : 'var(--ink-soft)', background: tab === t.id ? 'var(--accent-soft)' : 'transparent' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

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
  );
}
