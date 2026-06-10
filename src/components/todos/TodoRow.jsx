import React from 'react';
import { Icon } from '../Icons.jsx';
import { AgentAvatar } from '../Agents.jsx';
import { getAgents, getAgentById } from '../../lib/agentStore.js';

export function TodoRow({ item, canHandoff, editingId, editText, onToggle, onAssign, onHandoff, onStartEdit, onSaveEdit, onCancelEdit, onEditChange }) {
  const agents = Array.isArray(getAgents()) ? getAgents() : [];
  const agent = item.assignee ? getAgentById(item.assignee) : null;
  const [showAssign, setShowAssign] = React.useState(false);
  const isSent = Boolean(item.handoffPath || item.handoffTaskId || item.handedOffAt);
  const isEditing = editingId === item.id;
  
  const handleDoubleClick = () => {
    if (!isSent) {
      onStartEdit(item.id, item.text);
    }
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      onSaveEdit();
    } else if (e.key === 'Escape') {
      onCancelEdit();
    }
  };
  
  return (
    <div onDoubleClick={handleDoubleClick} style={{ display: 'grid', gridTemplateColumns: '16px minmax(0, 1fr) auto auto', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: item.done ? 'rgba(46, 204, 113, 0.08)' : 'var(--surface-2)', border: '1px solid ' + (item.done ? 'var(--ps-green)' : 'var(--hairline)'), position: 'relative', transition: 'all 0.2s ease', cursor: isSent ? 'default' : 'pointer' }}>
      <button onClick={(e) => { e.stopPropagation(); onToggle(); }} style={{ all: 'unset', cursor: 'pointer', width: 16, height: 16, borderRadius: 5, background: item.done ? 'var(--ps-green)' : 'transparent', boxShadow: 'inset 0 0 0 1.5px ' + (item.done ? 'transparent' : 'var(--hairline-strong)'), display: 'grid', placeItems: 'center', color: 'white', flexShrink: 0, transition: 'all 0.2s ease' }}>
        {item.done && <Icon.Check size={10} stroke={2.6}/>}
      </button>
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {isEditing ? (
          <div style={{ display: 'flex', gap: 4 }}>
            <input
              autoFocus
              value={editText}
              onChange={(e) => onEditChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={onSaveEdit}
              onClick={(e) => e.stopPropagation()}
              style={{ flex: 1, padding: '2px 6px', fontSize: 13.5, border: '1px solid var(--accent)', borderRadius: 4, outline: 'none', background: 'var(--surface)', color: 'var(--ink)' }}
            />
          </div>
        ) : (
          <span title={isSent ? 'Sent items cannot be edited' : 'Double-click to edit'} style={{ fontSize: 13.5, color: item.done ? 'var(--ink-faint)' : 'var(--ink)', textDecoration: item.done ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.text}</span>
        )}
        {(item.handoffPath || item.handoffWarning) && (
          <span title={item.handoffWarning || item.handoffPath} style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: item.handoffWarning ? 'var(--ps-orange)' : 'var(--ps-green)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {item.handoffWarning ? item.handoffWarning : `handed off -> ${item.handoffPath}`}
          </span>
        )}
      </div>
      <button onClick={(e) => { e.stopPropagation(); setShowAssign(s => !s); }} title={agent ? `Assigned to ${agent.name}` : 'Assign to agent'} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
        {agent ? <AgentAvatar agent={agent} size={20} /> : <div style={{ width: 20, height: 20, borderRadius: '50%', border: '1px dashed var(--hairline-strong)', display: 'grid', placeItems: 'center', color: 'var(--ink-faint)' }}><Icon.ArrowAssign size={11}/></div>}
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onHandoff(); }}
        disabled={!canHandoff || !item.assignee || item.handingOff}
        title={
          !canHandoff ? 'Open a local project first'
          : !item.assignee ? 'Assign to an agent first'
          : 'Create project handoff'
        }
        style={{ all: 'unset', cursor: canHandoff && item.assignee && !item.handingOff ? 'pointer' : 'not-allowed', width: 24, height: 24, borderRadius: 7, display: 'grid', placeItems: 'center', background: item.handoffPath ? 'var(--accent-soft)' : 'var(--surface)', border: '1px solid var(--hairline)', color: item.handoffPath ? 'var(--accent-ink)' : 'var(--ink-faint)', opacity: canHandoff && item.assignee ? 1 : 0.45 }}
      >
        {item.handingOff ? '...' : <Icon.ArrowAssign size={12} />}
      </button>
      {showAssign && <>
        <div onClick={(e) => { e.stopPropagation(); setShowAssign(false); }} style={{ position: 'fixed', inset: 0, zIndex: 5 }} />
        <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: 34, right: 8, zIndex: 6, background: 'var(--surface)', border: '1px solid var(--hairline)', borderRadius: 12, padding: 6, boxShadow: 'var(--shadow-pop)', display: 'flex', flexDirection: 'column', gap: 2, minWidth: 180 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-faint)', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 8px' }}>Assign to</div>
          <div onClick={() => { onAssign(null); setShowAssign(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: 'var(--ink-soft)' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-2)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>Unassigned</div>
          {agents.map(a => (
            <div key={a.id} onClick={() => { onAssign(a.id); setShowAssign(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-2)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
              <AgentAvatar agent={a} size={20} /><div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: 12, fontWeight: 500 }}>{a.name}</span><span style={{ fontSize: 10, color: 'var(--ink-faint)' }}>{a.role}</span></div>
            </div>
          ))}
        </div>
      </>}
    </div>
  );
}
