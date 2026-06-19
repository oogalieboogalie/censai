import React from 'react';
import { useWorkspaceStore } from '../../lib/store.js';

const HISTORY_KEYS = [
  'wins',
  'canvasGroups',
  'paths',
  'links',
  'groups',
  'dockOffset',
  'extraAgents',
  'penColor',
  'penSize',
  'penMode',
  'sidebarFavorites',
];
const HISTORY_LIMIT = 60;
const COALESCE_MS = 300;

function clone(value) {
  return typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function capture(state) {
  return Object.fromEntries(HISTORY_KEYS.map((key) => [key, clone(state[key])]));
}

function signature(snapshot) {
  return JSON.stringify(snapshot);
}

export function useWorkspaceHistory(enabled) {
  const pastRef = React.useRef([]);
  const futureRef = React.useRef([]);
  const currentRef = React.useRef(null);
  const pendingStartRef = React.useRef(null);
  const timerRef = React.useRef(null);
  const restoringRef = React.useRef(false);

  const flushPending = React.useCallback(() => {
    if (!pendingStartRef.current) return;
    pastRef.current.push(pendingStartRef.current);
    pastRef.current = pastRef.current.slice(-HISTORY_LIMIT);
    pendingStartRef.current = null;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  React.useEffect(() => {
    if (!enabled) return undefined;
    pastRef.current = [];
    futureRef.current = [];
    pendingStartRef.current = null;
    currentRef.current = capture(useWorkspaceStore.getState());

    const unsubscribe = useWorkspaceStore.subscribe((state) => {
      if (restoringRef.current) return;
      const next = capture(state);
      if (signature(next) === signature(currentRef.current)) return;
      if (!pendingStartRef.current) pendingStartRef.current = currentRef.current;
      currentRef.current = next;
      futureRef.current = [];
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flushPending, COALESCE_MS);
    });

    return () => {
      unsubscribe();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, flushPending]);

  const restore = React.useCallback((snapshot) => {
    restoringRef.current = true;
    useWorkspaceStore.setState({ ...clone(snapshot), activeId: null, selectedIds: [] });
    currentRef.current = clone(snapshot);
    restoringRef.current = false;
  }, []);

  const undo = React.useCallback(() => {
    flushPending();
    const previous = pastRef.current.pop();
    if (!previous || !currentRef.current) return false;
    futureRef.current.push(currentRef.current);
    restore(previous);
    return true;
  }, [flushPending, restore]);

  const redo = React.useCallback(() => {
    flushPending();
    const next = futureRef.current.pop();
    if (!next || !currentRef.current) return false;
    pastRef.current.push(currentRef.current);
    restore(next);
    return true;
  }, [flushPending, restore]);

  return { undo, redo };
}
