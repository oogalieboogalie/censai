import React from 'react';
import { api } from '../../lib/api.js';
import { normalizeTodos } from './TodosData.js';

export function useTodos(win, onUpdate, currentProject) {
  const items = React.useMemo(() => normalizeTodos(win.items), [win.items]);
  const [newText, setNewText] = React.useState('');
  const [handoffError, setHandoffError] = React.useState('');
  const [editingId, setEditingId] = React.useState(null);
  const [editText, setEditText] = React.useState('');
  const pendingHandoffs = React.useRef(new Set());

  const setItems = (next) => onUpdate({ items: normalizeTodos(typeof next === 'function' ? next(items) : next) });
  const toggle = (id) => setItems(items.map(it => it.id === id ? { ...it, done: !it.done } : it));
  const assign = (id, aid) => setItems(items.map(it => it.id === id ? { ...it, assignee: aid } : it));
  const add = () => { if (!newText.trim()) return; setItems([...items, { id: Date.now(), text: newText.trim(), done: false, assignee: null }]); setNewText(''); };
  const updateItem = (id, patch) => setItems(items.map(it => it.id === id ? { ...it, ...patch } : it));
  
  const startEdit = (id, text) => { setEditingId(id); setEditText(text); };
  const saveEdit = () => { if (editingId && editText.trim()) { updateItem(editingId, { text: editText.trim() }); } setEditingId(null); setEditText(''); };
  const cancelEdit = () => { setEditingId(null); setEditText(''); };
  
  const completedCount = React.useMemo(() => items.filter(it => it.done).length, [items]);
  const totalCount = items.length;

  const handoff = async (item) => {
    const sourceId = `${win.id || win.kind || 'todos'}:${item.id}`;
    if (item.handingOff || pendingHandoffs.current.has(sourceId)) return;
    pendingHandoffs.current.add(sourceId);
    setHandoffError('');
    updateItem(item.id, { handingOff: true });
    try {
      const result = await api.createProjectHandoff({
        title: item.text,
        text: item.text,
        assignee: item.assignee || null,
        sourceTitle: win.title || 'Project To-Dos',
        priority: item.priority || 'normal',
        sourceId,
      });
      updateItem(item.id, {
        handingOff: false,
        handedOffAt: new Date().toISOString(),
        handoffPath: result.relativePath || result.path,
        handoffTaskId: result.task?.id || null,
        handoffWarning: result.taskSkipped || null,
      });
      window.dispatchEvent(new Event('tasks-updated'));
    } catch (err) {
      updateItem(item.id, { handingOff: false });
      setHandoffError(err.message || 'Failed to create handoff');
    } finally {
      pendingHandoffs.current.delete(sourceId);
    }
  };

  return {
    items,
    newText, setNewText,
    handoffError,
    editingId, editText, setEditText,
    completedCount, totalCount,
    toggle, assign, add, startEdit, saveEdit, cancelEdit, handoff
  };
}
