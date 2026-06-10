import React from 'react';
import { CanvasWires } from './canvas/CanvasWires.jsx';
import { CanvasMarks, EmptyState } from './canvas/CanvasEmptyState.jsx';
import { CanvasDrawingLayer } from './canvas/CanvasDrawingLayer.jsx';
import { CanvasWindows } from './canvas/CanvasWindowLayers.jsx';
import { CanvasGroupsLayer } from './canvas/CanvasGroupsLayer.jsx';
import { CanvasRegionActions } from './canvas/CanvasRegionActions.jsx';
import { CanvasRubberBand } from './canvas/CanvasRubberBand.jsx';
import { CanvasShell } from './canvas/CanvasShell.jsx';
import { useCanvasCapture } from './canvas/useCanvasCapture.js';
import { useCanvasPointer } from './canvas/useCanvasPointer.js';
import { useCanvasViewport } from './canvas/useCanvasViewport.js';
import { useCanvasWorkspaceHandlers } from './canvas/useCanvasWorkspaceHandlers.js';
import { useCanvasZoomControls } from './canvas/useCanvasZoomControls.js';
import { ZoomHud } from './canvas/CanvasZoomHud.jsx';

export function Canvas({ wins, activeId, onUpdate, onClose, onSelect, onSpawn, onRubberBand, onRequestNewAgent, onCreateAgent, dockState, pan, zoom, onPanZoom, onFitView, onJumpNearestCluster, canvasGroups = [], onSpawnGroup, onUpdateGroup, onCloseGroup, onMoveGroup, onAutoArrangeGroup, onSaveGroupPreset, onLoadGroupPreset, onDeleteGroupPreset, paths = [], setPaths, links = [], onLinkCreate, onLinkDelete, currentProject = null, activeTool, penColor, penSize, penMode = false, pinnedRailOffset = { top: 24, left: 24 }, suppressEmptyState = false }) {
  const ref = React.useRef(null);
  const [region, setRegion] = React.useState(null);
  const [wireDrag, setWireDrag] = React.useState(null);
  const { spaceHeld, spaceRef } = useCanvasViewport({ ref, pan, zoom, onPanZoom });
  const {
    band,
    setBand,
    currentPath,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    panRef,
  } = useCanvasPointer({
    ref,
    pan,
    zoom,
    onPanZoom,
    onSelect,
    onSpawnGroup,
    activeTool,
    penMode,
    penColor,
    penSize,
    setPaths,
    setRegion,
    spaceRef,
  });
  const handleCapture = useCanvasCapture({ ref, region, setRegion, pan, zoom });
  const { zoomIn, zoomOut, resetView } = useCanvasZoomControls({ ref, pan, zoom, onPanZoom, onFitView });
  const {
    handleAssign,
    handleDragEnd,
    handleWireStart,
    handleWireDrag,
    handleWireEnd,
    handleGroupDragEnd,
    getProjectContextForWindow,
  } = useCanvasWorkspaceHandlers({
    ref,
    wins,
    canvasGroups,
    currentProject,
    pan,
    zoom,
    onUpdate,
    onSpawn,
    onAutoArrangeGroup,
    onUpdateGroup,
    onLinkCreate,
    setWireDrag,
  });
  return (<>
    <CanvasShell
      ref={ref}
      spaceHeld={spaceHeld}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      pan={pan}
      zoom={zoom}
      activeTool={activeTool}
      penMode={penMode}
      isPanning={Boolean(panRef.current)}
      fixedChildren={<>
        <CanvasWindows
          wins={wins}
          activeId={activeId}
          zoom={zoom}
          pan={pan}
          offset={pinnedRailOffset}
          canvasGroups={canvasGroups}
          groups={dockState?.groups || []}
          getProjectContext={getProjectContextForWindow}
          onUpdate={onUpdate}
          onClose={onClose}
          onSelect={onSelect}
          onSpawn={onSpawn}
          onCreateAgent={onCreateAgent}
          onAssign={handleAssign}
          onDragEnd={handleDragEnd}
          onWireStart={handleWireStart}
          onWireDrag={handleWireDrag}
          onWireEnd={handleWireEnd}
        />
      </>}
    >
        <CanvasMarks zoom={zoom} pan={pan} />

        <CanvasDrawingLayer
          wins={wins}
          links={links}
          wireDrag={wireDrag}
          paths={paths}
          currentPath={currentPath}
          zoom={zoom}
          penColor={penColor}
          penSize={penSize}
          onLinkDelete={onLinkDelete}
        />
        <CanvasGroupsLayer
          groups={canvasGroups}
          wins={wins}
          zoom={zoom}
          onUpdate={onUpdate}
          onUpdateGroup={onUpdateGroup}
          onCloseGroup={onCloseGroup}
          onMoveGroup={onMoveGroup}
          onGroupDragEnd={handleGroupDragEnd}
          onAutoArrangeGroup={onAutoArrangeGroup}
          onSaveGroupPreset={onSaveGroupPreset}
          onLoadGroupPreset={onLoadGroupPreset}
          onDeleteGroupPreset={onDeleteGroupPreset}
        />
        <CanvasWires wins={wins} dockState={dockState} pan={pan} zoom={zoom} />

        {wins.length === 0 && !band && !region && !suppressEmptyState && <EmptyState onSpawn={onSpawn} />}
        <CanvasRubberBand band={band} zoom={zoom} />

        <CanvasRegionActions
          region={region}
          zoom={zoom}
          wins={wins}
          setRegion={setRegion}
          onRubberBand={onRubberBand}
          onSpawn={onSpawn}
          onSpawnGroup={onSpawnGroup}
          onRequestNewAgent={onRequestNewAgent}
          onCapture={handleCapture}
        />
    </CanvasShell>

    <ZoomHud zoom={zoom} onZoomIn={zoomIn} onZoomOut={zoomOut} onReset={resetView} onJumpNearestCluster={onJumpNearestCluster} />
  </>);
}




