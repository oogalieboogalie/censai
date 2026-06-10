import React from 'react';
import { getOwningGroup } from '../../lib/layoutAlgo.js';
import { screenToCanvas } from '../../lib/canvasMath.js';
import { basenameFromPath, windowInsideGroup } from './CanvasInteractions.js';

export function useCanvasWorkspaceHandlers({
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
}) {
  const handleAssign = React.useCallback((data) => {
    const item = {
      id: crypto.randomUUID(),
      text: data.text,
      done: false,
      assignee: data.assignee,
      quoted: data.quoted,
      source: data.source,
      createdAt: Date.now(),
    };
    const existing = wins.find(ww => ww.kind === 'todos');
    if (existing) onUpdate(existing.id, { items: [...(existing.items || []), item] });
    else onSpawn('todos', { items: [item] });
  }, [wins, onUpdate, onSpawn]);

  const handleDragEnd = (winId, ox, oy) => {
    const draggedWin = wins.find(w => w.id === winId);
    if (!draggedWin) return;
    const owner = getOwningGroup(draggedWin, canvasGroups, false);
    onUpdate(winId, { groupId: owner ? owner.id : null });

    const dcx = draggedWin.x + draggedWin.w / 2;
    const dcy = draggedWin.y + draggedWin.h / 2;
    const group = canvasGroups.find(g => dcx >= g.x && dcx <= g.x + g.w && dcy >= g.y && dcy <= g.y + g.h);
    if (!group) return;

    const targetWin = wins.find(w => w.id !== winId && dcx >= w.x && dcx <= w.x + w.w && dcy >= w.y && dcy <= w.y + w.h);
    if (targetWin) {
      onUpdate(draggedWin.id, { x: targetWin.x, y: targetWin.y, w: targetWin.w, h: targetWin.h });
      onUpdate(targetWin.id, { x: ox, y: oy, w: draggedWin.w, h: draggedWin.h });
      setTimeout(() => onAutoArrangeGroup?.(group.id), 50);
    }
  };

  const handleWireStart = (winId, { x, y }) => {
    const canvasPt = screenToCanvas(x, y, pan.x, pan.y, zoom, ref.current.getBoundingClientRect());
    setWireDrag({ fromId: winId, startX: canvasPt.x, startY: canvasPt.y, x: canvasPt.x, y: canvasPt.y });
  };

  const handleWireDrag = ({ x, y }) => {
    if (!ref.current) return;
    const canvasPt = screenToCanvas(x, y, pan.x, pan.y, zoom, ref.current.getBoundingClientRect());
    setWireDrag(prev => prev ? { ...prev, x: canvasPt.x, y: canvasPt.y } : null);
  };

  const handleWireEnd = (winId, { x, y }) => {
    if (!ref.current) return;
    const canvasPt = screenToCanvas(x, y, pan.x, pan.y, zoom, ref.current.getBoundingClientRect());
    const targetWin = wins.find(w => w.id !== winId && canvasPt.x >= w.x && canvasPt.x <= w.x + w.w && canvasPt.y >= w.y && canvasPt.y <= w.y + w.h);
    if (targetWin && onLinkCreate) onLinkCreate(winId, targetWin.id);
    setWireDrag(null);
  };

  const handleGroupDragEnd = (groupId) => {
    const draggedGroup = canvasGroups.find(g => g.id === groupId);
    if (!draggedGroup) return;
    const owner = getOwningGroup(draggedGroup, canvasGroups.filter(g => g.id !== groupId), true);
    onUpdateGroup(groupId, { groupId: owner ? owner.id : null });
  };

  const getProjectContextForWindow = React.useCallback((win) => {
    if (!win || win.kind !== 'chat') return currentProject;
    const agentId = win.agentId;
    const candidateGroups = canvasGroups.filter(group => {
      if ((group.attachedAgents || []).includes(agentId)) return true;
      const inside = wins.filter(item => windowInsideGroup(item, group));
      return inside.some(item => item.id === win.id) ||
        inside.some(item => item.kind === 'agent' && item.agentId === agentId);
    });

    for (const group of candidateGroups) {
      const filesWin = wins.find(item => item.kind === 'files' && item.dirPath && windowInsideGroup(item, group));
      if (filesWin) {
        return {
          type: 'local',
          name: basenameFromPath(filesWin.dirPath),
          path: filesWin.dirPath,
          scopeType: 'canvas_group',
          scopeId: group.id,
          scopeLabel: group.label || 'Canvas Group',
        };
      }
    }

    return currentProject;
  }, [canvasGroups, currentProject, wins]);

  return { handleAssign, handleDragEnd, handleWireStart, handleWireDrag, handleWireEnd, handleGroupDragEnd, getProjectContextForWindow };
}
