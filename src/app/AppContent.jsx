import React from 'react';
import { useWorkspaceStore } from '../lib/store.js';
import { Canvas } from '../components/Canvas.jsx';
import { Chrome } from '../components/Chrome.jsx';
import { MultiGroupDock, DEFAULT_GROUPS } from '../components/Dock.jsx';
import { ThemePanel } from '../components/Theme.jsx';
import { Icon } from '../components/Icons.jsx';
import { addAgent, getAgentById, updateAgent, initializeAgents } from '../lib/agentStore.js';
import { inferLayout, cleanLayout, fitGroupToLayout, getGroupInnerBounds, makeGroupBoundsForWindows } from '../lib/layoutAlgo.js';
import { MIN_ZOOM, computeFitView, clusterWindows, boundsForItems, computeFitBounds } from '../lib/canvasMath.js';
import { api } from '../lib/api.js';
import { getCanvasObjectType, legacyKindForCanvasType } from '../lib/canvasObjectTypes.js';
import { DEFAULT_WINDOW_SIZES, getDefaultWindowSize } from '../lib/windowManifest.js';
import { createLogger } from '../lib/logger.js';
import { withTimeout, withoutUnsupportedWindows, randomDropSpot } from '../lib/appUtils.js';

import { Toolbar } from './Toolbar.jsx';
import { Hud } from './Hud.jsx';
import { useAppActions } from './hooks/useAppActions.js';
import { useAppPresets } from './hooks/useAppPresets.js';

const log = createLogger('canvas');

const DEFAULT_HTML_PREVIEW = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>CensaiHub Preview</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: Inter, system-ui, sans-serif;
        background: #f8fafc;
        color: #0f172a;
      }
      main {
        width: min(560px, calc(100vw - 48px));
        padding: 32px;
        border: 1px solid #dbe3ef;
        border-radius: 10px;
        background: white;
        box-shadow: 0 16px 45px rgba(15, 23, 42, 0.12);
      }
      h1 { margin: 0 0 10px; font-size: 28px; }
      p { margin: 0; line-height: 1.55; color: #475569; }
    </style>
  </head>
  <body>
    <main>
      <h1>HTML Preview</h1>
      <p>This preview window is live and ready for pasted or opened HTML.</p>
    </main>
  </body>
</html>`;

export function AppContent() {
  const [initial, setInitial] = React.useState(null);
  const [dataLoading, setDataLoading] = React.useState(true);
  const [isInitialized, setIsInitialized] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    const init = async () => {
      setDataLoading(true);
      setIsInitialized(false);
      initializeAgents().catch((err) => {
        console.error("Failed to initialize agents from database", err);
      });

      try {
        const [res, project] = await Promise.all([
          withTimeout(api.getWorkspace(), 1200, 'Workspace load').catch(() => null),
          withTimeout(api.getCurrentProject(), 1200, 'Current project load').catch(() => null),
        ]);
        if (cancelled) return;
        if (res?.extraAgents?.length) {
          res.extraAgents.forEach(a => {
            if (!getAgentById(a.id)) {
              addAgent(a);
            } else {
              updateAgent(a);
            }
          });
        }
        setInitial(res || {});
        setCurrentProject(project);
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load workspace from API", err);
        setInitial({});
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    };
    init();
    return () => { cancelled = true; };
  }, []);

  const { wins, setWins, canvasGroups, setCanvasGroups, paths, setPaths, links, setLinks, activeTool, setActiveTool, penColor, setPenColor, penSize, setPenSize, penMode, setPenMode, activeId, setActiveId, dockOffset, setDockOffset, groups, setGroups, settingsOpen, setSettingsOpen, focusMode, setFocusMode, extraAgents, setExtraAgents, currentProject, setCurrentProject, pan, setPan, zoom, setZoom, presets, setPresets } = useWorkspaceStore();

  React.useEffect(() => {
    if (initial && !dataLoading && !isInitialized) {
      const safeWins = withoutUnsupportedWindows(initial.wins || []);
      setWins(safeWins);
      setCanvasGroups(initial.canvasGroups || []);
      setPaths(initial.paths || []);
      setLinks(initial.links || []);
      if (initial.penColor) setPenColor(initial.penColor);
      if (initial.penSize) setPenSize(initial.penSize);
      setPenMode(Boolean(initial.penMode));
      setDockOffset(initial.dockOffset || 0);
      setGroups(initial.groups || DEFAULT_GROUPS);
      setFocusMode(initial.focusMode || false);
      setExtraAgents(initial.extraAgents || []);

      const fit = computeFitView(safeWins, initial.canvasGroups || []);
      setPan({ x: fit.x, y: fit.y });
      setZoom(fit.zoom);

      const id = requestAnimationFrame(() => setIsInitialized(true));
      return () => cancelAnimationFrame(id);
    }
  }, [initial, dataLoading, isInitialized]);
  const panRef = React.useRef(pan);
  const zoomRef = React.useRef(zoom);
  React.useEffect(() => { panRef.current = pan; }, [pan]);
  React.useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  const onPanZoom = React.useCallback(({ panX, panY, zoom: z }) => {
    setPan({ x: panX, y: panY });
    setZoom(z);
  }, []);
  const winsRef = React.useRef(wins);
  React.useEffect(() => { winsRef.current = wins; }, [wins]);
  const canvasGroupsRef = React.useRef(canvasGroups);
  React.useEffect(() => { canvasGroupsRef.current = canvasGroups; }, [canvasGroups]);
  const groupDragCacheRef = React.useRef(null);

  const { spawnAt, spawnGroup, onUpdate, onUpdateGroup, onCloseGroup, onClose, createAgent } = useAppActions(panRef, zoomRef, winsRef, canvasGroupsRef);
  const { saveAsPreset, loadPreset, deletePreset, saveGroupPreset, loadGroupPreset, deleteGroupPreset, autoArrangeGroup } = useAppPresets(panRef, zoomRef, winsRef, canvasGroupsRef);

  const persistTimeoutRef = React.useRef(null);
  React.useEffect(() => {
    if (!isInitialized) return;
    if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
    persistTimeoutRef.current = setTimeout(() => {
      // Pan/zoom intentionally not persisted — we always fit-to-content on load.
      const state = { wins: withoutUnsupportedWindows(wins), canvasGroups, dockOffset, groups, focusMode, paths, links, extraAgents, penColor, penSize, penMode };
      api.saveWorkspace(state);
    }, 1000);
    return () => {
      if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
    };
  }, [wins, canvasGroups, paths, links, groups, dockOffset, focusMode, extraAgents, penColor, penSize, penMode, isInitialized]);

  const fitView = React.useCallback(() => {
    const fit = computeFitView(winsRef.current, canvasGroupsRef.current);
    setPan({ x: fit.x, y: fit.y });
    setZoom(fit.zoom);
  }, []);

  const jumpToNearestCluster = React.useCallback(() => {
    const clusters = clusterWindows(winsRef.current);
    if (!clusters.length) return;

    const viewCenter = {
      x: (window.innerWidth / 2 - panRef.current.x) / zoomRef.current,
      y: (window.innerHeight / 2 - panRef.current.y) / zoomRef.current,
    };
    const nearest = clusters
      .map((cluster) => {
        const bounds = boundsForItems(cluster);
        const cx = bounds.minX + bounds.w / 2;
        const cy = bounds.minY + bounds.h / 2;
        return { cluster, bounds, distance: Math.hypot(cx - viewCenter.x, cy - viewCenter.y) };
      })
      .sort((a, b) => a.distance - b.distance)[0];

    const fit = computeFitBounds(nearest.bounds);
    setPan({ x: fit.x, y: fit.y });
    setZoom(fit.zoom);
  }, []);

  // ─── Presets: named snapshots of the workspace the user can save and restore ───
  React.useEffect(() => {
    api.getPresets().then(res => setPresets(res || []));
  }, []);

  const openLocalProject = React.useCallback(async ({ path, name }) => {
    const project = await api.setCurrentProject({ path, name });
    setCurrentProject(project);
    setWins(prev => {
      const existing = prev.find(w => w.kind === 'files');
      if (existing) {
        return prev.map(w => w.id === existing.id
          ? { ...w, mode: 'local', dirPath: project.path }
          : w
        );
      }
      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          kind: 'files',
          x: -180,
          y: -120,
          w: DEFAULT_WINDOW_SIZES.files.w,
          h: DEFAULT_WINDOW_SIZES.files.h,
          mode: 'local',
          dirPath: project.path,
        },
      ];
    });
    return project;
  }, []);

  const onNewAgent = () => spawnAt('agentDesigner');
  const onNewTerminal = () => spawnAt('terminal', { title: 'Terminal', cwd: currentProject?.path || '' });
  const onNewHtmlPreview = () => spawnAt('htmlPreview', { title: 'HTML Preview', fileName: 'preview.html', html: DEFAULT_HTML_PREVIEW });
  const onNewWindow = () => {
    const order = ['terminal', 'operationsBoard', 'chat', 'todos', 'workflow', 'files', 'group', 'calendar'];
    const counts = order.map(k => wins.filter(w => w.kind === k).length);
    const min = Math.min(...counts);
    const next = order[counts.indexOf(min)];
    if (next === 'chat') spawnAt('chat', { agentId: 'censai' });
    else if (next === 'group') spawnAt('group', { groupName: groups[0]?.name || 'Core Team', groupHue: groups[0]?.hue || 5, memberIds: groups[0]?.agentIds || ['architect','censai','atlas','genesis','nexus','foundation','echo'] });
    else if (next === 'terminal') onNewTerminal();
    else spawnAt(next);
  };
  const onNewWorkflow = () => spawnAt('workflow');
  const onSpawnRook = () => spawnAt('rook', { title: 'Rook Agent Control' });
  const onNewMailcow = () => spawnAt('mailcow', { title: 'Mailcow' });
  const onNewVex = () => spawnAt('vex', { title: 'Vex Orchestrator' });

  const onDragAgent = (agent, screenPt) => {
    const els = document.elementsFromPoint(screenPt.x, screenPt.y);
    const winEl = els.find(el => el.dataset?.winId);
    const groupEl = els.find(el => el.dataset?.groupId);

    if (winEl) {
      const winId = winEl.dataset.winId;
      const w = winsRef.current.find(x => x.id === winId);
      if (w && w.kind !== 'agent') {
        const attached = w.attachedAgents || [];
        if (!attached.includes(agent.id)) onUpdate(winId, { attachedAgents: [...attached, agent.id] });
        setActiveId(winId);
        return;
      }
      if (w && w.kind === 'agent') { setActiveId(winId); return; }
    } else if (groupEl) {
      const groupId = groupEl.dataset.groupId;
      const g = canvasGroupsRef.current.find(x => x.id === groupId);
      if (g) {
        const attached = g.attachedAgents || [];
        if (!attached.includes(agent.id)) onUpdateGroup(groupId, { attachedAgents: [...attached, agent.id] });
        return;
      }
    }
    // Convert screen coords to canvas-space coords
    const canvas = document.getElementById('canvas-root');
    const rect = canvas?.getBoundingClientRect();
    const currentPan = panRef.current;
    const currentZoom = zoomRef.current;
    const x = (screenPt.x - (rect?.left || 0) - currentPan.x) / currentZoom - 160;
    const y = (screenPt.y - (rect?.top || 0) - currentPan.y) / currentZoom - 80;
    const existing = winsRef.current.find(w => w.kind === 'agent' && w.agentId === agent.id);
    if (existing) { setActiveId(existing.id); onUpdate(existing.id, { x, y }); return; }
    spawnAt('agent', { agentId: agent.id }, { x, y });
  };

  React.useEffect(() => {
    const onKey = (e) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === 'n') { e.preventDefault(); onNewAgent(); }
      else if (meta && e.key.toLowerCase() === 'w') { e.preventDefault(); onNewWindow(); }
      else if (meta && e.key.toLowerCase() === 'f') { e.preventDefault(); setFocusMode(f => !f); }
      else if (e.key === 'Escape') { setSettingsOpen(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [wins.length]);

  if (dataLoading) {
    return <div style={{ position: 'fixed', inset: 0, background: 'var(--canvas)', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>Loading...</div>;
  }

  return (
    <>
      <div id="canvas-root" style={{ position: 'fixed', inset: 0 }}>
        <Canvas
          wins={wins} activeId={activeId}
          pan={pan} zoom={zoom} onPanZoom={onPanZoom} onFitView={fitView}
          onJumpNearestCluster={jumpToNearestCluster}
          onUpdate={onUpdate} onClose={onClose} onSelect={(id) => setActiveId(id)}
          onSpawn={spawnAt} dockState={{ groups, offset: dockOffset }}
          canvasGroups={canvasGroups}
          paths={paths} setPaths={setPaths}
          links={links} onLinkCreate={(fromId, toId) => setLinks(prev => [...prev.filter(l => !(l.fromId === fromId && l.toId === toId)), { id: crypto.randomUUID(), fromId, toId, timestamp: Date.now() }])}
          onLinkDelete={(id) => setLinks(prev => prev.filter(l => l.id !== id))}
          currentProject={currentProject}
          onSpawnGroup={spawnGroup}
          onUpdateGroup={onUpdateGroup}
          onCloseGroup={onCloseGroup}
          onAutoArrangeGroup={autoArrangeGroup}
          onSaveGroupPreset={saveGroupPreset}
          onLoadGroupPreset={loadGroupPreset}
          onDeleteGroupPreset={deleteGroupPreset}
          onMoveGroup={(id, dx, dy, isFirstMove) => {
            const g = canvasGroups.find(x => x.id === id);
            if (!g) return;

            if (isFirstMove) {
              const enclosedWins = wins.filter(w => w.groupId === id).map(w => ({ id: w.id, ox: w.x, oy: w.y }));
              const enclosedGroups = canvasGroups.filter(otherG => otherG.groupId === id).map(otherG => ({ id: otherG.id, ox: otherG.x, oy: otherG.y }));

              groupDragCacheRef.current = { ox: g.x, oy: g.y, enclosedWins, enclosedGroups };
            }

            const cache = groupDragCacheRef.current;
            if (!cache) return;

            onUpdateGroup(id, { x: cache.ox + dx, y: cache.oy + dy });

            cache.enclosedWins.forEach(item => {
              onUpdate(item.id, { x: item.ox + dx, y: item.oy + dy });
            });
            cache.enclosedGroups.forEach(item => {
              onUpdateGroup(item.id, { x: item.ox + dx, y: item.oy + dy });
            });
          }}
          onRubberBand={(rect) => {
            spawnAt('todos', { title: 'Plan', subtitle: 'rubber-banded region', items: [] },
              { x: rect.x, y: rect.y }, { w: Math.max(260, rect.w), h: Math.max(180, rect.h) });
          }}
          activeTool={activeTool} penColor={penColor} penSize={penSize} penMode={penMode}
          onRequestNewAgent={onNewAgent}
          onCreateAgent={createAgent}
        />
      </div>
      <Chrome
        projectName={currentProject?.name || "No project open"}
        currentProject={currentProject}
        onOpenLocalProject={openLocalProject}
        onNewAgent={onNewAgent} onNewWindow={onNewWindow} onNewWorkflow={onNewWorkflow}
        onNewTerminal={onNewTerminal}
        onNewHtmlPreview={onNewHtmlPreview} onSpawnRook={onSpawnRook} onNewMailcow={onNewMailcow} onNewVex={onNewVex}
        onSpawn={spawnAt}
        onToggleFocus={() => setFocusMode(f => !f)} focusMode={focusMode}
        penMode={penMode}
        onTogglePenMode={() => setPenMode(p => !p)}
        onOpenSettings={() => setSettingsOpen(true)}
        presets={presets}
        onSaveAsPreset={saveAsPreset}
        onLoadPreset={loadPreset}
        onDeletePreset={deletePreset}
        onMin={() => {
          if (activeId) {
            const activeWin = wins.find(w => w.id === activeId);
            if (activeWin) {
              onUpdate(activeId, { pinned: !activeWin.pinned });
            }
          }
        }}
        onMax={() => {}}
        onClose={() => {
          if (activeId) {
            onClose(activeId);
          }
        }}
      />
      <MultiGroupDock
        groups={groups} onGroupsChange={setGroups} focusMode={focusMode}
        onDragAgent={onDragAgent} dockOffset={dockOffset} onMoveDock={setDockOffset}
      />
      <ThemePanel open={settingsOpen} onClose={() => setSettingsOpen(false)} anchor={{ top: 56, right: 18 }}
        focusMode={focusMode} setFocusMode={setFocusMode}
        penMode={penMode} setPenMode={setPenMode}
        onResetWorkspace={() => { if (confirm('Clear all windows + designed agents?')) { api.resetWorkspace().finally(() => location.reload()); } }}
      />
      <Hud focusMode={focusMode} />
      <Toolbar
        activeTool={activeTool} onSelectTool={setActiveTool}
        penColor={penColor} setPenColor={setPenColor}
        penSize={penSize} setPenSize={setPenSize}
        focusMode={focusMode}
      />
    </>
  );
}
