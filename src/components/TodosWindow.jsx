import React from 'react';
import { Icon } from './Icons.jsx';
import { WindowTitle } from './Windows.jsx';
import { useTodos } from './todos/useTodos.js';
import { TodoRow } from './todos/TodoRow.jsx';

export function TodosWindow({ win, onUpdate, currentProject }) {
  const {
    items,
    newText, setNewText,
    handoffError,
    editingId, editText, setEditText,
    completedCount, totalCount,
    toggle, assign, add, startEdit, saveEdit, cancelEdit, handoff
  } = useTodos(win, onUpdate, currentProject);

  return (
    <>
      <WindowTitle accent="var(--ps-green)" icon={<Icon.Folder size={14}/>} label={win.title || 'Project To-Dos'} subtitle={win.subtitle || 'Newsletter / weekly'} attachedAgentIds={win.attachedAgents} onDetach={(id) => onUpdate({ attachedAgents: (win.attachedAgents || []).filter(a => a !== id) })} />
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 12, background: 'var(--surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '8px 12px', background: completedCount > 0 ? 'var(--ps-green)' : 'var(--surface-2)', borderRadius: 8, color: completedCount > 0 ? 'white' : 'var(--ink-faint)', fontSize: 12, fontWeight: 500, transition: 'background 0.3s ease' }}>
          <Icon.Check size={14} stroke={2.5} />
          <span>{completedCount} task{completedCount !== 1 ? 's' : ''} completed</span>
          {totalCount > 0 && <span style={{ marginLeft: 'auto', opacity: 0.7, fontSize: 11 }}>({completedCount}/{totalCount})</span>}
        </div>
        {!currentProject?.path && <div style={{ marginBottom: 8, color: 'var(--ps-red)', fontSize: 11, lineHeight: 1.4 }}>Open a local project before handing off todos.</div>}
        {handoffError && <div style={{ marginBottom: 8, color: 'var(--ps-red)', fontSize: 11, lineHeight: 1.4 }}>{handoffError}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map(it => <TodoRow key={it.id} item={it} canHandoff={Boolean(currentProject?.path)} editingId={editingId} editText={editText} onToggle={() => toggle(it.id)} onAssign={(aid) => assign(it.id, aid)} onHandoff={() => handoff(it)} onStartEdit={startEdit} onSaveEdit={saveEdit} onCancelEdit={cancelEdit} onEditChange={setEditText} />)}
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
          <Icon.Plus size={14} style={{ color: 'var(--ink-faint)' }} />
          <input value={newText} onChange={(e) => setNewText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }} placeholder="add a to-do"
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: 'var(--ink)', padding: '4px 0' }} />
        </div>
      </div>
    </>
  );
}
