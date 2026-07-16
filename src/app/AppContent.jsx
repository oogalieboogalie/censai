import React from 'react';
import { useWorkspaceStore } from '../lib/store.js';
import { Canvas } from '../components/Canvas.jsx';
import { Chrome } from '../components/Chrome.jsx';
import { MultiGroupDock, DEFAULT_GROUPS } from '../components/Dock.jsx';

import { Icon } from '../components/Icons.jsx';
import { inferLayout, cleanLayout, fitGroupToLayout, getGroupInnerBounds, makeGroupBoundsForWindows } from '../lib/layoutAlgo.js';
import { MIN_ZOOM, computeFitView, clusterWindows, boundsForItems, computeFitBounds } from '../lib/canvasMath.js';
import { api } from '../lib/api.js';
import { getCanvasObjectType, legacyKindForCanvasType } from '../lib/canvasObjectTypes.js';
import { DEFAULT_WINDOW_SIZES, getDefaultWindowSize } from '../lib/windowManifest.js';
import { createLogger } from '../lib/logger.js';
import { withoutUnsupportedWindows, randomDropSpot, DEFAULT_HTML_PREVIEW } from '../lib/appUtils.js';
import { applyAllowListToInitial } from '../lib/workspace/allowList.js';
import {
  getChromeWindowControlState,
  runChromeCloseAction,
  runChromeMaximizeAction,
  runChromeMinimizeAction,
} from './chromeWindowControls.js';

import { Toolbar } from './Toolbar.jsx';
import { Hud } from './Hud.jsx';
import { useAppActions } from './hooks/useAppActions.js';
import { useAppBootstrap } from './hooks/useAppBootstrap.js';
import { useAppPresets } from './hooks/useAppPresets.js';
import { useWorkspaceHistory } from './hooks/useWorkspaceHistory.js';
import { Login } from '../components/Login.jsx';
import { SovereignAccessGate } from '../components/SovereignAccessGate.jsx';
import { shouldShowSovereignAccessGate } from '../lib/sovereignAccess.js';

const log = createLogger('canvas');

export function AppContent() {
  const { initial, dataLoading, isInitialized, session, sessionChecking } = useAppBootstrap();
  const [sovereignUnlocked, setSovereignUnlocked] = React.useState(false);
  const unlockSovereignAccess = React.useCallback(() => setSovereignUnlocked(true), []);

  const {
    wins, setWins,
    canvasGroups, setCanvasGroups,
    paths, setPaths,
    links, setLinks,
    activeTool, setActiveTool,
    penColor, setPenColor,
    penSize, setPenSize,
    penMode, setPenMode,
    activeId, setActiveId,
    selectedIds, setSelectedIds,
    dockOffset, setDockOffset,
    groups, setGroups,
    focusMode, setFocusMode,
    extraAgents, setExtraAgents,
    currentProject, setCurrentProject,
    workspaceId, setWorkspaceId,
    pan, setPan,
    zoom, setZoom,
    presets, setPresets,
    sidebarFavorites, setSidebarFavorites,
    windowAllowList, setWindowAllowList,
    // Store named actions
    createLink, deleteLink,
    fitView, jumpToNearestCluster,
    onDragAgent,
    onNewAgent, onNewTerminal, onNewHtmlPreview, onNewWindow, onNewWorkflow, onSpawnRook, onNewMailcow, onNewVex,
    openLocalProject, moveGroup
  } = useWorkspaceStore();

  React.useEffect(() => {
    if (initial && !dataLoading && !isInitialized) {
      // Brief B1 — apply migrated window allow-list (single helper).
      const { wins: gatedWins, windowAllowList: appliedAllowList } = applyAllowListToInitial(initial, windowAllowList);
      setWindowAllowList(appliedAllowList);
      const safeWins = withoutUnsupportedWindows(gatedWins);
      setWins(safeWins);
      setCanvasGroups(initial.canvasGroups || []);
      setPaths(initial.paths || []);
      setLinks(initial.links || []);
      if (initial.penColor) setPenColor(initial.penColor);
      if (initial.penSize) setPenSize(initial.penSize); setWorkspaceId(initial.workspaceId || crypto.randomUUID());
      setPenMode(Boolean(initial.penMode));
      setDockOffset(initial.dockOffset || 0);
      setGroups(initial.groups || DEFAULT_GROUPS);
      setFocusMode(initial.focusMode || false);
      setExtraAgents(initial.extraAgents || []); setSidebarFavorites(initial.sidebarFavorites || []);

      const fit = computeFitView(safeWins, initial.canvasGroups || []);
      setPan({ x: fit.x, y: fit.y });
      setZoom(fit.zoom);
      // Brief B2 — auto-launch the marketplace when the user has zero enabled windows (the marketplace itself is always allowed, so this only fires for fully-empty workspaces).
      if (appliedAllowList && !Object.values(appliedAllowList).some(Boolean)) setTimeout(() => spawnAt('marketplace'), 0);
      const id = requestAnimationFrame(() => setIsInitialized(true));
      return () => cancelAnimationFrame(id);
    }
  }, [initial, dataLoading, isInitialized, spawnAt]);

  const onPanZoom = React.useCallback(({ panX, panY, zoom: z }) => {
    setPan({ x: panX, y: panY });
    setZoom(z);
  }, []);

  const { spawnAt, spawnGroup, onUpdate, onUpdateGroup, resizeGroup, deleteWindows, onCloseGroup, onClose, createAgent } = useAppActions();
  const { saveAsPreset, loadPreset, deletePreset, saveGroupPreset, loadGroupPreset, deleteGroupPreset, autoArrangeGroup } = useAppPresets();
  const { undo, redo } = useWorkspaceHistory(isInitialized);
  const windowControlState = React.useMemo(
    () => getChromeWindowControlState({ wins, activeId, focusMode }),
    [wins, activeId, focusMode]
  );
  const handleWindowSelect = React.useCallback((id, event) => {
    if (!id) {
      setActiveId(null);
      setSelectedIds([]);
      return;
    }
    const toggle = Boolean(event?.metaKey || event?.ctrlKey || event?.shiftKey);
    setActiveId(id);
    setSelectedIds((current) => {
      if (!toggle) return [id];
      return current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id];
    });
  }, [setActiveId, setSelectedIds]);
  const handleSelection = React.useCallback((ids) => {
    setSelectedIds(ids);
    setActiveId(ids.at(-1) || null);
  }, [setActiveId, setSelectedIds]);

  const persistTimeoutRef = React.useRef(null);
  React.useEffect(() => {
    if (!isInitialized) return;
    if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
    persistTimeoutRef.current = setTimeout(() => {
      // Pan/zoom intentionally not persisted — we always fit-to-content on load. Brief B1 — windowAllowList persisted so opt-in choices survive reload.
      api.saveWorkspace({ workspaceId, wins: withoutUnsupportedWindows(wins), canvasGroups, dockOffset, groups, focusMode, paths, links, extraAgents, penColor, penSize, penMode, sidebarFavorites, windowAllowList });
    }, 1000);
    return () => {
      if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
    };
  }, [workspaceId, wins, canvasGroups, paths, links, groups, dockOffset, focusMode, extraAgents, penColor, penSize, penMode, sidebarFavorites, windowAllowList, isInitialized]);

  // ─── Presets: named snapshots of the workspace the user can save and restore ───
  React.useEffect(() => {
    api.getPresets().then(res => setPresets(res || []));
  }, []);

  React.useEffect(() => {
    const onKey = (e) => {
      const meta = e.metaKey || e.ctrlKey;
      const editing = ['INPUT', 'TEXTAREA'].includes(e.target.tagName) || e.target.contentEditable === 'true';
      if (meta && !editing && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      else if (meta && !editing && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
      if (meta && e.key.toLowerCase() === 'n') { e.preventDefault(); onNewAgent(); }
      else if (meta && e.key.toLowerCase() === 'w') { e.preventDefault(); onNewWindow(); }
      else if (meta && e.key.toLowerCase() === 'f') { e.preventDefault(); setFocusMode(f => !f); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onNewAgent, onNewWindow, redo, setFocusMode, undo]);

  React.useEffect(() => {
    const handlePaste = (e) => {
      const editing = ['INPUT', 'TEXTAREA'].includes(e.target.tagName) || e.target.contentEditable === 'true';
      if (editing) return;

      const text = e.clipboardData?.getData('text');
      if (!text) return;

      e.preventDefault();

      // Simple heuristic: if it has common programming language keywords, brackets, etc.
      // or HTML-like tags, treat it as code.
      const startsLikeCode = /^\s*(?:import|export|const|let|var|function|class|def|public|private|package|using|#include)\b/m.test(text);
      const isCode = startsLikeCode || /[{}]|<\/?[a-z][\s\S]*>/i.test(text);

      if (isCode) {
        spawnAt('code_editor', {
          title: 'Pasted Code',
          code: text,
        });
      } else {
        spawnAt('doc', {
          fileName: 'Pasted Note.md',
          text: text,
        });
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [spawnAt]);

  if (sessionChecking) {
    return <div style={{ position: 'fixed', inset: 0, background: 'var(--canvas)', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>Authenticating...</div>;
  }

  if (!session.authenticated) {
    return <Login oauthConfigured={session.oauthConfigured} onLoginSuccess={() => window.location.reload()} />;
  }

  if (shouldShowSovereignAccessGate(session, sovereignUnlocked)) {
    return <SovereignAccessGate onConfigured={unlockSovereignAccess} />;
  }

  if (dataLoading) {
    return <div style={{ position: 'fixed', inset: 0, background: 'var(--canvas)', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>Loading...</div>;
  }

  return (
    <>
      <div id="canvas-root" style={{ position: 'fixed', inset: 0 }}>
        <Canvas
          wins={wins} activeId={activeId} selectedIds={selectedIds}
          pan={pan} zoom={zoom} onPanZoom={onPanZoom} onFitView={fitView}
          onJumpNearestCluster={jumpToNearestCluster}
          onUpdate={onUpdate} onClose={onClose} onSelect={handleWindowSelect}
          onSelection={handleSelection} onDeleteSelected={deleteWindows}
          onSpawn={spawnAt} dockState={{ groups, offset: dockOffset }}
          canvasGroups={canvasGroups}
          paths={paths} setPaths={setPaths}
          links={links} onLinkCreate={createLink}
          onLinkDelete={deleteLink}
          currentProject={currentProject}
          onSpawnGroup={spawnGroup}
          onUpdateGroup={onUpdateGroup}
          onResizeGroup={resizeGroup}
          onCloseGroup={onCloseGroup}
          onAutoArrangeGroup={autoArrangeGroup}
          onSaveGroupPreset={saveGroupPreset}
          onLoadGroupPreset={loadGroupPreset}
          onDeleteGroupPreset={deleteGroupPreset}
          onMoveGroup={moveGroup}
          onRubberBand={(rect) => { const size = getDefaultWindowSize('todos');
            spawnAt('todos', { title: 'Plan', subtitle: 'rubber-banded region', items: [] },
              { x: rect.x, y: rect.y }, { w: Math.max(size.w, rect.w), h: Math.max(size.h, rect.h) });
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
        onOpenSettings={() => {
          const existing = wins.find(w => w.kind === 'appearance');
          if (existing) {
            setActiveId(existing.id);
          } else {
            spawnAt('appearance');
          }
        }}
        presets={presets}
        onSaveAsPreset={saveAsPreset}
        onLoadPreset={loadPreset}
        onDeletePreset={deletePreset}
        windowControlState={windowControlState}
        onMin={() => runChromeMinimizeAction({ wins, activeId, onUpdate })}
        onMax={() => runChromeMaximizeAction({
          wins,
          activeId,
          onUpdate,
          onToggleFocus: () => setFocusMode((f) => !f),
        })}
        onClose={() => runChromeCloseAction({ activeId, onClose })}
      />
      <MultiGroupDock
        groups={groups} onGroupsChange={setGroups} focusMode={focusMode}
        onDragAgent={onDragAgent} dockOffset={dockOffset} onMoveDock={setDockOffset}
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
