import React from 'react';
import { useWorkspaceStore } from '../../lib/store.js';
import { addAgent } from '../../lib/agentStore.js';
import { getCanvasObjectType, legacyKindForCanvasType, canvasObjectToLegacyWindow } from '../../lib/canvasObjectTypes.js';
import { getDefaultWindowSize } from '../../lib/windowManifest.js';
import { inferLayout, cleanLayout, fitGroupToLayout, getGroupInnerBounds, makeGroupBoundsForWindows } from '../../lib/layoutAlgo.js';
import { randomDropSpot } from '../../lib/appUtils.js';
import { createLogger } from '../../lib/logger.js';

const log = createLogger('canvas-actions');

export function useAppActions(panRef, zoomRef, winsRef, canvasGroupsRef) {
  const {
    setWins,
    setCanvasGroups,
    setLinks,
    setActiveId,
    setGroups,
    setExtraAgents,
  } = useWorkspaceStore();

  const spawnAt = React.useCallback((kind, props = {}, pos = null, size = null) => {
    const id = crypto.randomUUID();
    const type = getCanvasObjectType({ type: kind });
    const legacyKind = legacyKindForCanvasType(type);
    const sz = size || getDefaultWindowSize(legacyKind || type);
    const p = pos || randomDropSpot(sz, panRef.current, zoomRef.current);
    const now = new Date().toISOString();
    
    const win = canvasObjectToLegacyWindow({
      id,
      type,
      kind: legacyKind,
      title: props.title || '',
      x: p.x,
      y: p.y,
      width: sz.w,
      height: sz.h,
      w: sz.w,
      h: sz.h,
      zIndex: null,
      state: {},
      metadata: {},
      createdBy: null,
      lockedBy: null,
      createdAt: now,
      updatedAt: now,
      ...props,
    });

    setWins(prev => {
      if (props.kind === 'calendar' || kind === 'calendar') {
        const existing = prev.find(w => w.kind === 'calendar');
        if (existing) {
          return prev.map(w => w.id === existing.id ? { ...w, ...props, data: { ...w.data, ...props.data } } : w);
        }
      }
      return [...prev, win];
    });

    const finalId = (kind === 'calendar' || props.kind === 'calendar')
      ? (winsRef.current.find(w => w.kind === 'calendar')?.id || id)
      : id;
    setActiveId(finalId);
    log.info('window spawned', { kind: legacyKind || type, type, id: finalId });
    return finalId;
  }, [setWins, setActiveId, panRef, zoomRef, winsRef]);

  const spawnGroup = React.useCallback((pos, size) => {
    const id = crypto.randomUUID();
    const hue = Math.floor(Math.random() * 360);
    const inside = winsRef.current.filter(w => {
      const cx = w.x + w.w / 2;
      const cy = w.y + w.h / 2;
      return cx >= pos.x && cx <= pos.x + size.w && cy >= pos.y && cy <= pos.y + size.h;
    });
    
    let rect = { x: pos.x, y: pos.y, w: size.w, h: size.h };
    let root = null;
    
    if (inside.length > 0) {
      root = inferLayout(inside);
      rect = makeGroupBoundsForWindows(inside) || rect;
      if (root) {
        rect = fitGroupToLayout(rect, root);
        const updates = cleanLayout(root, getGroupInnerBounds(rect));
        setWins(prev => prev.map(w => {
          if (!inside.some(iw => iw.id === w.id)) return w;
          const up = updates.find(u => u.id === w.id);
          return up ? { ...w, ...up.patch, groupId: id } : { ...w, groupId: id };
        }));
      } else {
        setWins(prev => prev.map(w => inside.some(iw => iw.id === w.id) ? { ...w, groupId: id } : w));
      }
    }
    setCanvasGroups(prev => [...prev, { id, label: 'New Group', hue, root, ...rect }]);
    return id;
  }, [setWins, setCanvasGroups, winsRef]);

  const onUpdate = React.useCallback((id, patch) => setWins(prev => prev.map(w => {
    if (w.id !== id) return w;
    return canvasObjectToLegacyWindow({
      ...w,
      ...patch,
      width: Number.isFinite(patch.width) ? patch.width : (Number.isFinite(patch.w) ? patch.w : w.width),
      height: Number.isFinite(patch.height) ? patch.height : (Number.isFinite(patch.h) ? patch.h : w.height),
      updatedAt: new Date().toISOString(),
    });
  })), [setWins]);

  const onUpdateGroup = React.useCallback((id, patch) => setCanvasGroups(prev => prev.map(g => {
    if (g.id !== id) return g;
    if (('w' in patch || 'h' in patch) && (patch.w !== g.w || patch.h !== g.h)) {
      log.warn('group size change', {
        id,
        from: { w: g.w, h: g.h },
        to: { w: patch.w ?? g.w, h: patch.h ?? g.h },
      });
    }
    return { ...g, ...patch };
  })), [setCanvasGroups]);

  const onCloseGroup = React.useCallback((id) => setCanvasGroups(prev => prev.filter(g => g.id !== id)), [setCanvasGroups]);

  const onClose = React.useCallback((id) => {
    setWins(prev => prev.filter(w => w.id !== id));
    setLinks(prev => prev.filter(l => l.fromId !== id && l.toId !== id));
    setActiveId(prev => prev === id ? null : prev);
  }, [setWins, setLinks, setActiveId]);

  const createAgent = React.useCallback((agent, options = {}) => {
    addAgent(agent);
    setExtraAgents(prev => prev.some(existing => existing.id === agent.id)
      ? prev.map(existing => existing.id === agent.id ? { ...existing, ...agent } : existing)
      : [...prev, agent]
    );
    if (options.groupIds?.length) {
      setGroups(prev => prev.map(group => (
        options.groupIds.includes(group.id)
          ? { ...group, agentIds: [...new Set([...(group.agentIds || []), agent.id])] }
          : group
      )));
    }
    spawnAt('agent', { agentId: agent.id });
  }, [spawnAt, setExtraAgents, setGroups]);

  return {
    spawnAt,
    spawnGroup,
    onUpdate,
    onUpdateGroup,
    onCloseGroup,
    onClose,
    createAgent
  };
}
