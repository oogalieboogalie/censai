import React from 'react';
import { AgentAvatar } from '../../Agents.jsx';
import { Icon } from '../../Icons.jsx';
import {
  darkInputStyle, sectionTitleStyle, chipBoxStyle, selectedChipStyle,
  toolSearchStyle, catalogStyle, categoryTitleStyle, toolGridStyle,
  toolButtonStyle, scopeStyle, listStyle, nodeStyle, nodeHeaderStyle,
  nodeBodyStyle, nodeToolRowStyle, segmentedStyle, segmentStyle,
  dotStyle, nodeToolDotStyle,
} from './styles.js';

export function Field({ label, count, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11, fontWeight: 800, color: '#f8fafc' }}>
        <span>{label}</span>
        {count && <span style={{ color: '#38bdf8', fontWeight: 700 }}>{count}</span>}
      </span>
      {children}
    </label>
  );
}

export function Segmented({ value, options, onChange }) {
  return (
    <div style={segmentedStyle}>
      {options.map(([id, label]) => (
        <button key={id} onClick={() => onChange(id)} style={{
          ...segmentStyle,
          background: value === id ? '#0369a1' : 'transparent',
          color: value === id ? 'white' : '#e2e8f0',
        }}>{label}</button>
      ))}
    </div>
  );
}

export function ColorPicker({ hue, setHue }) {
  return (
    <Field label="Accent">
      <div style={{ position: 'relative', height: 22, background: 'linear-gradient(to right, oklch(0.7 0.16 0), oklch(0.7 0.16 60), oklch(0.7 0.16 120), oklch(0.7 0.16 180), oklch(0.7 0.16 240), oklch(0.7 0.16 300), oklch(0.7 0.16 360))', borderRadius: 999, cursor: 'pointer' }}
        onClick={e => { const r = e.currentTarget.getBoundingClientRect(); setHue(Math.round(((e.clientX - r.left) / r.width) * 360)); }}>
        <div style={{ position: 'absolute', left: `${(hue / 360) * 100}%`, top: '50%', transform: 'translate(-50%,-50%)', width: 16, height: 16, borderRadius: '50%', background: `oklch(0.72 0.16 ${hue})`, boxShadow: '0 0 0 2px #111827, 0 0 0 3px #e2e8f0', pointerEvents: 'none' }} />
      </div>
    </Field>
  );
}

export function ScopePanel({ githubRepos, setGithubRepos, localPaths, setLocalPaths }) {
  return (
    <div style={scopeStyle}>
      <div style={sectionTitleStyle}>Scopes</div>
      <Field label="GitHub repos">
        <textarea value={githubRepos} onChange={e => setGithubRepos(e.target.value)} placeholder="owner/repo, owner/another-repo" style={{ ...darkInputStyle, minHeight: 54, resize: 'vertical' }} />
      </Field>
      <Field label="Local paths">
        <textarea value={localPaths} onChange={e => setLocalPaths(e.target.value)} placeholder="src/components, server/routes" style={{ ...darkInputStyle, minHeight: 54, resize: 'vertical' }} />
      </Field>
    </div>
  );
}

export function ToolCategory({ category, selectedTools, toggleTool }) {
  return (
    <div>
      <div style={categoryTitleStyle}>{category.label}</div>
      <div style={toolGridStyle}>
        {category.tools.map(tool => {
          const selected = selectedTools.includes(tool.name);
          return (
            <button key={tool.name} onClick={() => toggleTool(tool.name)} title={tool.description} style={{
              ...toolButtonStyle,
              borderColor: selected ? '#38bdf8' : '#334155',
              background: selected ? '#082f49' : '#111827',
            }}>
              <span style={dotStyle(tool.category)} />
              <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tool.label}</span>
              <span style={{ marginLeft: 'auto', color: selected ? '#7dd3fc' : '#64748b' }}>{selected ? 'On' : '+'}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AgentRow({ agent, selected, onClick }) {
  return (
    <button onClick={onClick} style={{
      all: 'unset',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '7px 8px',
      borderRadius: 8,
      background: selected ? '#082f49' : '#111827',
      border: `1px solid ${selected ? '#38bdf8' : '#334155'}`,
      color: '#e2e8f0',
    }}>
      <AgentAvatar agent={agent} size={24} />
      <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <span style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{agent.name}</span>
        <span style={{ fontSize: 10.5, color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{agent.role}</span>
      </span>
    </button>
  );
}

export function GroupSelectionList({ groups, groupIds, toggleGroup }) {
  return (
    <div style={listStyle}>
      {groups.map(group => {
        const selected = groupIds.includes(group.id);
        return (
          <button key={group.id} onClick={() => toggleGroup(group.id)} style={{
            all: 'unset',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            padding: '7px 9px',
            borderRadius: 8,
            background: selected ? '#082f49' : '#111827',
            border: `1px solid ${selected ? '#38bdf8' : '#334155'}`,
            color: '#e2e8f0',
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.name}</span>
            <span style={{ width: 16, height: 16, borderRadius: '50%', display: 'grid', placeItems: 'center', background: selected ? '#38bdf8' : 'transparent', color: selected ? '#031525' : '#64748b', boxShadow: selected ? 'none' : 'inset 0 0 0 1px #334155' }}>
              {selected && <Icon.Check size={10} stroke={2.4} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function AgentNode({ agent, title, body, hue, primary, tools }) {
  return (
    <div style={{ ...nodeStyle, borderColor: primary ? `oklch(0.62 0.15 ${hue})` : '#334155' }}>
      <div style={{ ...nodeHeaderStyle, background: primary ? `oklch(0.44 0.16 ${hue})` : `oklch(0.34 0.16 ${hue})` }}>
        <AgentAvatar agent={agent} size={18} />
        <span>{title}</span>
      </div>
      <div style={nodeBodyStyle}>{body || 'No information added'}</div>
      <div style={nodeToolRowStyle}>
        {tools.length ? tools.map(tool => <span key={tool.name} title={tool.label} style={nodeToolDotStyle(tool.category)} />) : <span style={{ color: '#94a3b8' }}>No tools</span>}
      </div>
    </div>
  );
}

export function ToolChipBar({ selectedToolRows, toggleTool, toolSearch, setToolSearch }) {
  return (
    <div style={chipBoxStyle}>
      {selectedToolRows.map(tool => (
        <button key={tool.name} onClick={() => toggleTool(tool.name)} title={tool.description} style={selectedChipStyle}>
          <span style={dotStyle(tool.category)} />
          {tool.label}
          <span style={{ color: '#cbd5e1' }}>x</span>
        </button>
      ))}
      <input value={toolSearch} onChange={e => setToolSearch(e.target.value)} placeholder="Search available tools" style={toolSearchStyle} />
    </div>
  );
}

export function ToolCatalog({ filteredCategories, selectedTools, toggleTool }) {
  return (
    <div style={catalogStyle}>
      {filteredCategories.map(category => (
        <ToolCategory key={category.id} category={category} selectedTools={selectedTools} toggleTool={toggleTool} />
      ))}
    </div>
  );
}
