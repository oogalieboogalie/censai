import React from 'react';
import { useWorkspaceStore } from '../../lib/store.js';
import { api } from '../../lib/api.js';
import { addAgent, getAgentById } from '../../lib/agentStore.js';
import { withoutUnsupportedWindows } from '../../lib/appUtils.js';
import { computeFitView } from '../../lib/canvasMath.js';
import { inferLayout, fitGroupToLayout, getGroupInnerBounds, cleanLayout } from '../../lib/layoutAlgo.js';
export function useAppPresets(panRef, zoomRef, winsRef, canvasGroupsRef) {
  const {
    setWins,
    setCanvasGroups,
    setPaths,
    setLinks,
    setGroups,
    setDockOffset,
    setExtraAgents,
    setPan,
    setZoom,
    setActiveId,
    presets, setPresets,
    paths,
    groups,
    dockOffset,
    extraAgents
  } = useWorkspaceStore();

  const presetsRef = React.useRef(presets);
  React.useEffect(() => { presetsRef.current = presets; }, [presets]);

  const saveAsPreset = React.useCallback(async (rawName) => {
    const name = (rawName || '').trim() || `Preset ${new Date().toLocaleString()}`;
    const preset = {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date().toISOString(),
      wins: withoutUnsupportedWindows(winsRef.current),
      canvasGroups: canvasGroupsRef.current,
      paths,
      links: useWorkspaceStore.getState().links, // need fresh links
      groups,
      dockOffset,
      extraAgents,
      pan: panRef.current,
      zoom: zoomRef.current,
    };
    const next = [preset, ...presetsRef.current.filter(p => p.id !== preset.id)];
    try {
      await api.savePresets(next);
      setPresets(next);
    } catch (err) {
      console.error('Failed to save preset', err);
      window.alert('Preset was not saved.');
    }
  }, [paths, groups, dockOffset, extraAgents, panRef, zoomRef, winsRef, canvasGroupsRef, setPresets]);

  const loadPreset = React.useCallback((presetId) => {
    const preset = presets.find(p => p.id === presetId);
    if (!preset) return;
    const safeWins = withoutUnsupportedWindows(preset.wins || []);
    const hasContent = winsRef.current.length > 0 || canvasGroupsRef.current.length > 0;
    if (hasContent && !window.confirm(`Replace current workspace with "${preset.name}"?`)) return;
    
    (preset.extraAgents || []).forEach(a => { if (!getAgentById(a.id)) addAgent(a); });
    setWins(safeWins);
    setCanvasGroups(preset.canvasGroups || []);
    setPaths(preset.paths || []);
    setLinks(preset.links || []);
    if (preset.groups) setGroups(preset.groups);
    if (typeof preset.dockOffset === 'number') setDockOffset(preset.dockOffset);
    if (preset.extraAgents) setExtraAgents(preset.extraAgents);
    
    if (preset.pan && typeof preset.zoom === 'number') {
      setPan(preset.pan);
      setZoom(preset.zoom);
    } else {
      const fit = computeFitView(safeWins, preset.canvasGroups || []);
      setPan({ x: fit.x, y: fit.y });
      setZoom(fit.zoom);
    }
    setActiveId(null);
  }, [presets, setWins, setCanvasGroups, setPaths, setLinks, setGroups, setDockOffset, setExtraAgents, setPan, setZoom, setActiveId, winsRef, canvasGroupsRef]);

  const deletePreset = React.useCallback(async (presetId) => {
    const preset = presetsRef.current.find(p => p.id === presetId);
    if (!preset) return;
    if (!window.confirm(`Delete preset "${preset.name}"?`)) return;
    const next = presetsRef.current.filter(p => p.id !== presetId);
    try {
      await api.savePresets(next, { allowEmpty: true });
      setPresets(next);
    } catch (err) {
      console.error('Failed to delete preset', err);
    }
  }, [setPresets]);

  const snapshotGroup = React.useCallback((groupId, name) => {
    const g = canvasGroupsRef.current.find(x => x.id === groupId);
    if (!g) return null;
    const inside = winsRef.current.filter(w => {
      const cx = w.x + w.w / 2;
      const cy = w.y + w.h / 2;
      return cx >= g.x && cx <= g.x + g.w && cy >= g.y && cy <= g.y + g.h;
    });
    return {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date().toISOString(),
      groupBox: { x: g.x, y: g.y, w: g.w, h: g.h },
      root: g.root || null,
      windows: inside.map(w => ({ id: w.id, x: w.x, y: w.y, w: w.w, h: w.h })),
    };
  }, [winsRef, canvasGroupsRef]);

  const saveGroupPreset = React.useCallback((groupId, rawName) => {
    const name = (rawName || '').trim() || `Layout ${new Date().toLocaleTimeString()}`;
    const snap = snapshotGroup(groupId, name);
    if (!snap) return;
    setCanvasGroups(prev => prev.map(g => g.id === groupId
      ? { ...g, presets: [snap, ...((g.presets || []).filter(p => p.name !== name))] }
      : g
    ));
  }, [snapshotGroup, setCanvasGroups]);

  const loadGroupPreset = React.useCallback((groupId, presetId) => {
    const g = canvasGroupsRef.current.find(x => x.id === groupId);
    if (!g) return;
    const preset = (g.presets || []).find(p => p.id === presetId);
    if (!preset) return;
    setWins(prev => prev.map(w => {
      const saved = preset.windows.find(sw => sw.id === w.id);
      return saved ? { ...w, x: saved.x, y: saved.y, w: saved.w, h: saved.h } : w;
    }));
    setCanvasGroups(prev => prev.map(grp => grp.id === groupId
      ? { ...grp, ...(preset.groupBox || {}), root: preset.root || null }
      : grp
    ));
  }, [setWins, setCanvasGroups, canvasGroupsRef]);

  const deleteGroupPreset = React.useCallback((groupId, presetId) => {
    setCanvasGroups(prev => prev.map(g => g.id === groupId
      ? { ...g, presets: (g.presets || []).filter(p => p.id !== presetId) }
      : g
    ));
  }, [setCanvasGroups]);

  const autoArrangeGroup = React.useCallback((groupId) => {
    const g = canvasGroupsRef.current.find(x => x.id === groupId);
    if (!g) return;
    const inside = winsRef.current.filter(w => {
      const cx = w.x + w.w / 2;
      const cy = w.y + w.h / 2;
      return cx >= g.x && cx <= g.x + g.w && cy >= g.y && cy <= g.y + g.h;
    });
    if (inside.length === 0) return;

    const undoSnap = snapshotGroup(groupId, 'Before auto-arrange');
    const root = inferLayout(inside);
    if (!root) return;
    const fittedGroup = fitGroupToLayout(g, root);
    const updates = cleanLayout(root, getGroupInnerBounds(fittedGroup));

    setWins(prev => prev.map(w => {
      const up = updates.find(u => u.id === w.id);
      return up ? { ...w, ...up.patch } : w;
    }));
    setCanvasGroups(prev => prev.map(grp => grp.id === groupId
      ? { ...grp, ...fittedGroup, root, presetId: undefined, presets: [undoSnap, ...((grp.presets || []).filter(p => p.name !== 'Before auto-arrange'))] }
      : grp
    ));
  }, [snapshotGroup, setWins, setCanvasGroups, winsRef, canvasGroupsRef]);

  return {
    saveAsPreset,
    loadPreset,
    deletePreset,
    saveGroupPreset,
    loadGroupPreset,
    deleteGroupPreset,
    autoArrangeGroup
  };
}
