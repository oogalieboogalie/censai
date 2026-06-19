import React from 'react';
import { MAX_ZOOM, MIN_ZOOM, distance, getPanAfterZoom, screenToCanvas } from '../../lib/canvasMath.js';
import { snapStrokeToRectangle, windowsInSelection } from './CanvasInteractions.js';

export function shouldStartCanvasPan(button, keyboardHeld, panMode = 'both') {
  return (['both', 'middle'].includes(panMode) && button === 1)
    || (button === 0 && keyboardHeld);
}

export function useCanvasPointer({
  ref,
  pan,
  zoom,
  onPanZoom,
  onSelect,
  onSpawnGroup,
  wins,
  onSelection,
  activeTool,
  penMode,
  penColor,
  penSize,
  setPaths,
  setRegion,
  spaceRef,
  panMode = 'both',
}) {
  const [band, setBand] = React.useState(null);
  const [currentPath, setCurrentPath] = React.useState(null);
  const dragRef = React.useRef(null);
  const panRef = React.useRef(null);
  const activeTouchPointsRef = React.useRef(new Map());
  const pinchRef = React.useRef(null);
  const suppressContextMenuRef = React.useRef(false);

  const onPointerDown = (e) => {
    const isCanvasBg = e.target === ref.current || e.target.dataset?.canvasBg;
    const isPen = e.pointerType === 'pen';
    const isTouch = e.pointerType === 'touch';
    const isPenEraser = penMode && isPen && (e.button === 5 || e.buttons === 32);

    // Blur active input/textarea/contenteditable on canvas background click/pan
    const isPanningStart = shouldStartCanvasPan(e.button, spaceRef.current, panMode);
    if ((isCanvasBg || isPanningStart) && document.activeElement && typeof document.activeElement.blur === 'function') {
      const tag = document.activeElement.tagName;
      if (['INPUT', 'TEXTAREA'].includes(tag) || document.activeElement.contentEditable === 'true') {
        document.activeElement.blur();
      }
    }

    if (isTouch) {
      activeTouchPointsRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (activeTouchPointsRef.current.size >= 2) {
        const touches = [...activeTouchPointsRef.current.values()];
        const first = touches[0];
        const second = touches[1];
        pinchRef.current = {
          startDistance: Math.max(1, Math.hypot(second.x - first.x, second.y - first.y)),
          startZoom: zoom,
          startPanX: pan.x,
          startPanY: pan.y,
        };
        e.preventDefault();
        dragRef.current = null;
        panRef.current = null;
        setBand(null);
        setRegion(null);
        setCurrentPath(null);
        try { ref.current.setPointerCapture(e.pointerId); } catch {}
        return;
      }
      if (!penMode) return;
    }

    if (isPanningStart || (penMode && isTouch && e.button === 0 && isCanvasBg)) {
      e.preventDefault();
      panRef.current = { sx: e.clientX, sy: e.clientY, ox: pan.x, oy: pan.y };
      ref.current.setPointerCapture(e.pointerId);
      return;
    }

    if (e.button === 2) {
      if (!isCanvasBg) return;
      e.preventDefault();
      const rect = ref.current.getBoundingClientRect();
      const canvasPt = screenToCanvas(e.clientX, e.clientY, pan.x, pan.y, zoom, rect);
      dragRef.current = { id: e.pointerId, x0: canvasPt.x, y0: canvasPt.y, started: false, mode: 'group' };
      ref.current.setPointerCapture(e.pointerId);
      onSelect(null);
      onSelection?.([]);
      setRegion(null);
    }

    if (e.button === 0 || isPenEraser) {
      if (!isCanvasBg && activeTool !== 'eraser') {
        onSelect(null);
        return;
      }
      e.preventDefault();
      const rect = ref.current.getBoundingClientRect();
      const canvasPt = screenToCanvas(e.clientX, e.clientY, pan.x, pan.y, zoom, rect);
      const pressure = isPen && e.pressure > 0 ? e.pressure : 1;

      if (activeTool === 'eraser' || isPenEraser) {
        dragRef.current = { id: e.pointerId, isErasing: true };
        setPaths(prev => prev.filter(p => !p.pts.some(pt => distance(pt.x, pt.y, canvasPt.x, canvasPt.y) < 16 / zoom)));
      } else if (activeTool === 'pen' || (penMode && isPen)) {
        dragRef.current = { id: e.pointerId, isDrawing: true };
        setCurrentPath([{ x: canvasPt.x, y: canvasPt.y, p: pressure }]);
      } else {
        dragRef.current = {
          id: e.pointerId,
          x0: canvasPt.x,
          y0: canvasPt.y,
          started: false,
          mode: e.shiftKey ? 'region' : 'selection',
        };
      }

      ref.current.setPointerCapture(e.pointerId);
      onSelect(null);
      onSelection?.([]);
      setRegion(null);
    }
  };

  const onPointerMove = (e) => {
    if (e.pointerType === 'touch') {
      activeTouchPointsRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinchRef.current && activeTouchPointsRef.current.size >= 2) {
        const touches = [...activeTouchPointsRef.current.values()];
        const first = touches[0];
        const second = touches[1];
        const rect = ref.current.getBoundingClientRect();
        const centerX = ((first.x + second.x) / 2) - rect.left;
        const centerY = ((first.y + second.y) / 2) - rect.top;
        const distanceNow = Math.max(1, Math.hypot(second.x - first.x, second.y - first.y));
        const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, pinchRef.current.startZoom * (distanceNow / pinchRef.current.startDistance)));
        const nextPan = getPanAfterZoom(
          pinchRef.current.startPanX,
          pinchRef.current.startPanY,
          centerX,
          centerY,
          pinchRef.current.startZoom,
          newZoom,
        );
        onPanZoom({ ...nextPan, zoom: newZoom });
        return;
      }
    }

    if (panRef.current) {
      const p = panRef.current;
      onPanZoom({ panX: p.ox + (e.clientX - p.sx), panY: p.oy + (e.clientY - p.sy), zoom });
      return;
    }

    if (!dragRef.current) return;
    const rect = ref.current.getBoundingClientRect();
    const canvasPt = screenToCanvas(e.clientX, e.clientY, pan.x, pan.y, zoom, rect);
    const d = dragRef.current;

    if (d.isDrawing) {
      const pressure = e.pointerType === 'pen' && e.pressure > 0 ? e.pressure : 1;
      setCurrentPath(prev => prev ? [...prev, { x: canvasPt.x, y: canvasPt.y, p: pressure }] : null);
      return;
    }

    if (d.isErasing) {
      setPaths(prev => prev.filter(p => !p.pts.some(pt => distance(pt.x, pt.y, canvasPt.x, canvasPt.y) < 16 / zoom)));
      return;
    }

    if (!d.started && distance(canvasPt.x, canvasPt.y, d.x0, d.y0) < 6 / zoom) return;
    d.started = true;
    setBand({
      x: Math.min(d.x0, canvasPt.x),
      y: Math.min(d.y0, canvasPt.y),
      w: Math.abs(canvasPt.x - d.x0),
      h: Math.abs(canvasPt.y - d.y0),
      mode: d.mode,
      isGroup: d.mode === 'group',
      isSelection: d.mode === 'selection',
    });
  };

  const onPointerUp = (e) => {
    if (e.pointerType === 'touch') {
      activeTouchPointsRef.current.delete(e.pointerId);
      if (activeTouchPointsRef.current.size < 2) pinchRef.current = null;
    }

    if (panRef.current) {
      panRef.current = null;
      try { ref.current.releasePointerCapture(e.pointerId); } catch {}
      return;
    }
    const d = dragRef.current;
    if (d) {
      try { ref.current.releasePointerCapture(e.pointerId); } catch {}
    }
    dragRef.current = null;

    if (d?.isDrawing) {
      if (currentPath && currentPath.length > 1) {
        const avgPressure = currentPath.reduce((sum, pt) => sum + (pt.p || 1), 0) / currentPath.length;
        const snappedPath = snapStrokeToRectangle(currentPath) || currentPath;
        setPaths(prev => [...prev, { id: crypto.randomUUID(), pts: snappedPath, color: penColor, size: penSize * Math.max(0.35, avgPressure) }]);
      }
      setCurrentPath(null);
      return;
    }

    if (d?.isErasing) return;

    if (d?.mode === 'group' && d.started) suppressContextMenuRef.current = true;
    if (d && d.started && band && band.w > 30 && band.h > 30) {
      if (d.mode === 'group') {
        onSpawnGroup({ x: band.x, y: band.y }, { w: band.w, h: band.h });
      } else if (d.mode === 'selection') {
        onSelection?.(windowsInSelection(wins, band));
        setRegion(band);
      } else {
        setRegion(band);
      }
    }
    setBand(null);
  };

  const consumeContextMenuSuppression = () => {
    const suppressed = suppressContextMenuRef.current;
    suppressContextMenuRef.current = false;
    return suppressed;
  };

  return { band, setBand, currentPath, onPointerDown, onPointerMove, onPointerUp, panRef, consumeContextMenuSuppression };
}
