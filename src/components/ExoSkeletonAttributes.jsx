import React from 'react';

export function ExoSkeletonAttributes({ agent, allAttributes, equippedAttributes, previewPrompt, handleToggleAttribute }) {
  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      {/* Attributes List Grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', margin: '0 0 4px 0' }}>Equip Persona Traits</h3>
          <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Toggle attributes to inject customized trait descriptions into the agent's prompt template.</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {allAttributes.map(attr => {
            const isEquipped = equippedAttributes.includes(attr.id);
            return (
              <div
                key={attr.id}
                onClick={() => handleToggleAttribute(attr.id)}
                style={{
                  padding: 14, borderRadius: 10, background: 'var(--surface)',
                  border: `2px solid ${isEquipped ? 'var(--accent)' : 'var(--hairline)'}`,
                  boxShadow: isEquipped ? '0 0 12px var(--accent-soft)' : 'var(--shadow-card)',
                  cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 6,
                  transition: 'all 0.2s', position: 'relative', overflow: 'hidden'
                }}
              >
                {isEquipped && (
                  <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, background: 'var(--accent)' }} />
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: isEquipped ? 6 : 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{attr.name}</span>
                  {isEquipped && <span style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 700 }}>ACTIVE</span>}
                </div>
                <span style={{ fontSize: 11, color: 'var(--ink-soft)', lineHeight: 1.3, paddingLeft: isEquipped ? 6 : 0 }}>{attr.description}</span>
                <div style={{ 
                  fontSize: 10, fontFamily: 'monospace', color: 'var(--ink-faint)', 
                  borderTop: '1px dashed var(--hairline)', paddingTop: 6, marginTop: 4,
                  paddingLeft: isEquipped ? 6 : 0 
                }}>
                  Value: "{attr.value}"
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Template Madlib Compiler Preview Pane */}
      <div style={{ width: 320, display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--hairline)', background: 'var(--surface)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px dashed var(--hairline)' }}>
          <span style={{ fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: 1 }}>Live Compiler</span>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', margin: '2px 0 0 0' }}>Prompt Preview</h3>
        </div>

        <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)' }}>System Template:</span>
            <div style={{
              background: 'var(--surface-2)', border: '1px solid var(--hairline)',
              padding: 10, borderRadius: 6, fontSize: 10, fontFamily: 'monospace',
              whiteSpace: 'pre-wrap', maxHeight: 110, overflowY: 'auto', color: 'var(--ink-faint)',
              lineHeight: 1.4
            }}>
              {agent.system_prompt || `You are ${agent.name}. ${agent.role || ''}`}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)' }}>Compiled System Prompt:</span>
            <div style={{
              flex: 1, background: 'var(--surface-2)', border: '1px solid var(--accent-soft)',
              boxShadow: 'inset 0 0 10px rgba(0,0,0,0.05)',
              padding: 12, borderRadius: 6, fontSize: 10, fontFamily: 'monospace',
              whiteSpace: 'pre-wrap', overflowY: 'auto', color: 'var(--ink)',
              lineHeight: 1.4
            }}>
              {previewPrompt || <span style={{ color: 'var(--ink-faint)', fontStyle: 'italic' }}>No template prompt defined for this agent.</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
