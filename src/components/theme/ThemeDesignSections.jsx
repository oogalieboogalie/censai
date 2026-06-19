import React from 'react';
import { Icon } from '../Icons.jsx';
import { ColorWheel, Slider, SurfaceControl, ThemePanelCard } from './ThemeControls.jsx';
import { MoodChip, MoodSwatch, SavedPresetRow } from './ThemePresets.jsx';
import { MOODS, THEME_PRESETS } from '../Theme.jsx';

export function AccentSection({ theme, setTheme }) {
  return (
    <ThemePanelCard style={{ padding: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '188px 1fr', gap: 16, alignItems: 'center' }}>
        <ColorWheel hue={theme.hue} chroma={theme.chroma} onChange={(p) => setTheme(p)} />
        <div style={{ display: 'grid', gap: 12, minWidth: 0 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Accent</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-faint)', marginTop: 3 }}>oklch({theme.lightness.toFixed(2)} {theme.chroma.toFixed(3)} {theme.hue})</div>
          </div>
          <div style={{ height: 40, borderRadius: 8, background: 'var(--accent)', boxShadow: 'inset 0 0 0 1px oklch(0 0 0 / 0.12)' }} />
          <Slider label="Lightness" value={+theme.lightness} min={0.35} max={0.85} step={0.01} onChange={(lightness) => setTheme({ lightness })} format={v => v.toFixed(2)} />
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {Object.entries(THEME_PRESETS).map(([name, p]) => (
              <button
                key={name}
                onClick={() => setTheme(p)}
                title={name}
                style={{ all: 'unset', cursor: 'pointer', width: 26, height: 26, borderRadius: 7, background: `oklch(${p.lightness} ${p.chroma} ${p.hue})`, boxShadow: 'inset 0 0 0 1px oklch(0 0 0 / 0.12), 0 2px 5px oklch(0 0 0 / 0.08)' }}
              />
            ))}
          </div>
        </div>
      </div>
    </ThemePanelCard>
  );
}

export function MoodSection({ theme, resetTheme, randomizeTheme, applyMoodPreset, moodsExpanded, setMoodsExpanded }) {
  const selectedMood = MOODS[theme.mood] || MOODS.cream;
  return (
    <ThemePanelCard style={{ padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
        <button
          type="button"
          onClick={() => setMoodsExpanded(v => !v)}
          style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9, minWidth: 0, flex: 1 }}
        >
          <MoodSwatch name={theme.mood} mood={selectedMood} active size={28} />
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Base Mood</div>
              <span style={{ color: 'var(--ink-faint)', transform: moodsExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', display: 'inline-flex' }}>
                <Icon.Down size={12} />
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{theme.mood} · {selectedMood.mode}</div>
          </div>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <button onClick={() => setMoodsExpanded(v => !v)} style={{ all: 'unset', cursor: 'pointer', padding: '6px 9px', borderRadius: 7, background: 'var(--surface)', border: '1px solid var(--hairline)', color: 'var(--ink-soft)', fontSize: 11, fontWeight: 650 }}>
            {moodsExpanded ? 'Collapse' : 'Expand'}
          </button>
          {randomizeTheme && (
            <button onClick={randomizeTheme} style={{ all: 'unset', cursor: 'pointer', padding: '6px 9px', borderRadius: 7, background: 'var(--surface)', border: '1px solid var(--hairline)', color: 'var(--ink-soft)', fontSize: 11, fontWeight: 650 }}>
              Randomize
            </button>
          )}
          <button onClick={resetTheme} style={{ all: 'unset', cursor: 'pointer', padding: '6px 9px', borderRadius: 7, background: 'var(--surface)', border: '1px solid var(--hairline)', color: 'var(--ink-soft)', fontSize: 11, fontWeight: 650 }}>Reset</button>
        </div>
      </div>
      {moodsExpanded ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(112px, 1fr))', gap: 7 }}>
          {Object.keys(MOODS).map(name => (
            <MoodChip key={name} name={name} mood={MOODS[name]} active={theme.mood === name} onClick={() => applyMoodPreset(name)} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {Object.keys(MOODS).map(name => (
            <MoodSwatch key={name} name={name} mood={MOODS[name]} active={theme.mood === name} onClick={() => applyMoodPreset(name)} />
          ))}
        </div>
      )}
    </ThemePanelCard>
  );
}

export function SavedPresetsSection({
  theme,
  customPresets,
  applyCustomPreset,
  deleteCustomPreset,
  savingPreset,
  setSavingPreset,
  presetName,
  setPresetName,
  saveCurrentPreset
}) {
  return (
    <ThemePanelCard style={{ padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Saved Presets</div>
          <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Save this exact color setup</div>
        </div>
        {!savingPreset && (
          <button onClick={() => { setPresetName(`${theme.mood} ${customPresets.length + 1}`); setSavingPreset(true); }} style={{ all: 'unset', cursor: 'pointer', padding: '6px 9px', borderRadius: 7, background: 'var(--accent-soft)', border: '1px solid var(--accent)', color: 'var(--accent-ink)', fontSize: 11, fontWeight: 700 }}>Save</button>
        )}
      </div>
      {savingPreset && (
        <div style={{ display: 'flex', gap: 7, marginBottom: 10 }}>
          <input
            autoFocus
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveCurrentPreset();
              if (e.key === 'Escape') { setSavingPreset(false); setPresetName(''); }
            }}
            placeholder="Preset name"
            style={{ minWidth: 0, flex: 1, border: '1px solid var(--hairline)', background: 'var(--surface)', borderRadius: 7, padding: '6px 8px', font: '12px var(--font-sans)', color: 'var(--ink)', outline: 'none' }}
          />
          <button onClick={saveCurrentPreset} style={{ all: 'unset', cursor: 'pointer', padding: '6px 10px', borderRadius: 7, background: 'var(--accent)', color: 'white', fontSize: 11, fontWeight: 700 }}>Save</button>
          <button onClick={() => { setSavingPreset(false); setPresetName(''); }} title="Cancel" style={{ all: 'unset', cursor: 'pointer', width: 28, borderRadius: 7, background: 'var(--surface)', border: '1px solid var(--hairline)', color: 'var(--ink-faint)', display: 'grid', placeItems: 'center' }}><Icon.Close size={12} /></button>
        </div>
      )}
      {customPresets.length > 0 ? (
        <div style={{ display: 'grid', gap: 7 }}>
          {customPresets.map(preset => (
            <SavedPresetRow
              key={preset.id}
              preset={preset}
              active={preset.theme?.mood === theme.mood && preset.theme?.hue === theme.hue && preset.theme?.chroma === theme.chroma && preset.theme?.lightness === theme.lightness}
              onApply={() => applyCustomPreset(preset)}
              onDelete={() => deleteCustomPreset(preset.id)}
            />
          ))}
        </div>
      ) : (
        <div style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--surface)', border: '1px dashed var(--hairline)', color: 'var(--ink-faint)', fontSize: 11 }}>
          No saved presets yet.
        </div>
      )}
    </ThemePanelCard>
  );
}
