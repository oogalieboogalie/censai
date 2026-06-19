import React from 'react';
import { AgentAvatar } from './Agents.jsx';

export const AVAILABLE_MODULES = {
  head: [
    { id: 'cog-1', name: 'First-Principles Thinking', desc: 'Strips problems down to foundational truths', color: 'var(--ps-purple)' },
    { id: 'cog-2', name: 'Blast Radius Mitigation', desc: 'Rigid boundaries to contain failures', color: 'var(--ps-purple)' },
    { id: 'cog-3', name: 'Ruthless Scope Minimization', desc: 'Focuses strictly on essential business value', color: 'var(--ps-purple)' },
  ],
  mainHand: [
    { id: 'act-1', name: 'Browser Actuator', desc: 'Enables DOM manipulation and navigation', color: 'var(--ps-blue)' },
    { id: 'act-2', name: 'Terminal Access', desc: 'Unrestricted execution of system shell commands', color: 'var(--ps-red)' },
  ],
  offHand: [
    { id: 'sens-1', name: 'Google Calendar Sync', desc: 'Live read/write access to schedule', color: 'var(--ps-yellow)' },
    { id: 'sens-2', name: 'GitHub Webhook', desc: 'Listens for PR and Issue events', color: 'var(--ps-green)' },
  ],
  trinket: [
    { id: 'mem-1', name: 'Vector Database', desc: 'Semantic search across entire codebase', color: 'var(--ps-orange)' },
    { id: 'mem-2', name: 'Obsidian Vault', desc: 'Direct read access to knowledge base', color: 'var(--ps-orange)' },
  ]
};

export const SLOT_CONFIG = {
  head: { label: 'Cognition', position: { top: '10%', left: '50%', transform: 'translate(-50%, 0)' } },
  mainHand: { label: 'Actuator', position: { top: '50%', left: '10%', transform: 'translate(0, -50%)' } },
  offHand: { label: 'Sensor', position: { top: '50%', right: '10%', transform: 'translate(0, -50%)' } },
  trinket: { label: 'Memory', position: { bottom: '10%', left: '50%', transform: 'translate(-50%, 0)' } },
};

export const MODULE_CAPABILITIES = {
  'cog-1': { capability_id: 'cognition.first_principles', mode: 'autonomous' },
  'cog-2': { capability_id: 'cognition.blast_radius', mode: 'autonomous' },
  'cog-3': { capability_id: 'cognition.scope_minimization', mode: 'autonomous' },
  'act-1': { capability_id: 'browser.use', mode: 'autonomous' },
  'act-2': { capability_id: 'terminal.execute', mode: 'execute_with_approval' },
  'sens-1': { capability_id: 'calendar.write', mode: 'autonomous' },
  'sens-2': { capability_id: 'github.write', mode: 'execute_with_approval' },
  'mem-1': { capability_id: 'memory.read', mode: 'autonomous' },
  'mem-2': { capability_id: 'files.read', mode: 'autonomous' }
};

function ConnectionLines({ equipped }) {
  return (
    <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      <line x1="50%" y1="50%" x2="50%" y2="20%" stroke="var(--hairline)" strokeWidth="2" strokeDasharray="4 4" />
      <line x1="50%" y1="50%" x2="50%" y2="80%" stroke="var(--hairline)" strokeWidth="2" strokeDasharray="4 4" />
      <line x1="50%" y1="50%" x2="25%" y2="50%" stroke="var(--hairline)" strokeWidth="2" strokeDasharray="4 4" />
      <line x1="50%" y1="50%" x2="75%" y2="50%" stroke="var(--hairline)" strokeWidth="2" strokeDasharray="4 4" />

      {equipped.head && <line x1="50%" y1="50%" x2="50%" y2="20%" stroke="var(--ps-purple)" strokeWidth="2" />}
      {equipped.trinket && <line x1="50%" y1="50%" x2="50%" y2="80%" stroke="var(--ps-orange)" strokeWidth="2" />}
      {equipped.mainHand && <line x1="50%" y1="50%" x2="25%" y2="50%" stroke={AVAILABLE_MODULES.mainHand.find(m => m.id === equipped.mainHand)?.color || 'var(--ps-blue)'} strokeWidth="2" />}
      {equipped.offHand && <line x1="50%" y1="50%" x2="75%" y2="50%" stroke={AVAILABLE_MODULES.offHand.find(m => m.id === equipped.offHand)?.color || 'var(--ps-yellow)'} strokeWidth="2" />}
    </svg>
  );
}

function CentralAgentNode({ agent }) {
  return (
    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--surface)', border: '2px solid var(--hairline)', display: 'grid', placeItems: 'center', boxShadow: 'var(--shadow-card)' }}>
        <AgentAvatar agent={agent} size={56} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{agent.name}</span>
      <span style={{ fontSize: 10, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: 1 }}>Core</span>
    </div>
  );
}

function EquipmentSlot({ slotKey, config, equipped, activeSlot, setActiveSlot, handleUnequip }) {
  const isEquipped = !!equipped[slotKey];
  const module = isEquipped ? AVAILABLE_MODULES[slotKey].find(m => m.id === equipped[slotKey]) : null;
  const isActive = activeSlot === slotKey;

  return (
    <div
      onClick={() => setActiveSlot(isActive ? null : slotKey)}
      style={{
        position: 'absolute', ...config.position, zIndex: 2,
        width: 140, height: 80, borderRadius: 12,
        background: 'var(--surface)',
        border: `2px ${isEquipped ? 'solid' : 'dashed'} ${isEquipped ? module.color : isActive ? 'var(--accent-ink)' : 'var(--hairline)'}`,
        boxShadow: isActive ? '0 0 0 4px var(--hairline)' : 'var(--shadow-float)',
        cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, padding: 8, textAlign: 'center',
        transition: 'all 0.2s'
      }}
    >
      {!isEquipped ? (
        <>
          <span style={{ fontSize: 10, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: 1 }}>{config.label} Slot</span>
          <span style={{ fontSize: 12, color: 'var(--ink-soft)', fontWeight: 600 }}>Click to Equip</span>
        </>
      ) : (
        <>
          <span style={{ fontSize: 10, color: module.color, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>{config.label}</span>
          <span style={{ fontSize: 11, color: 'var(--ink)', fontWeight: 600, lineHeight: 1.2 }}>{module.name}</span>
          <button
            onClick={(e) => handleUnequip(slotKey, e)}
            style={{ all: 'unset', position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--hairline)', display: 'grid', placeItems: 'center', color: 'var(--ink-faint)', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
            title="Unequip"
          >
            ✕
          </button>
        </>
      )}
    </div>
  );
}

function SelectionSidebar({ activeSlot, equipped, setActiveSlot, handleEquip }) {
  if (!activeSlot) return null;

  return (
    <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 240, background: 'var(--surface)', borderLeft: '1px solid var(--hairline)', zIndex: 10, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 30px rgba(0,0,0,0.1)' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px dashed var(--hairline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: 1 }}>Equip</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{SLOT_CONFIG[activeSlot].label} Module</span>
        </div>
        <button onClick={() => setActiveSlot(null)} style={{ all: 'unset', cursor: 'pointer', color: 'var(--ink-faint)' }}>✕</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {AVAILABLE_MODULES[activeSlot].map(mod => (
          <div
            key={mod.id}
            onClick={() => handleEquip(activeSlot, mod.id)}
            style={{
              padding: 12, borderRadius: 8, background: 'var(--surface-2)', border: `1px solid ${equipped[activeSlot] === mod.id ? mod.color : 'var(--hairline)'}`,
              cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4, position: 'relative', overflow: 'hidden'
            }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, background: mod.color }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', paddingLeft: 6 }}>{mod.name}</span>
            <span style={{ fontSize: 10, color: 'var(--ink-faint)', paddingLeft: 6, lineHeight: 1.4 }}>{mod.desc}</span>

            {equipped[activeSlot] === mod.id && (
              <span style={{ position: 'absolute', top: 12, right: 12, fontSize: 10, fontWeight: 700, color: mod.color, textTransform: 'uppercase' }}>Equipped</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ExoSkeletonModules({ agent, equipped, setEquipped, debugTools, saveCapabilities, onUpdate }) {
  const [activeSlot, setActiveSlot] = React.useState(null);

  const handleEquip = async (slot, moduleId) => {
    const newEquipped = { ...equipped, [slot]: moduleId };
    setEquipped(newEquipped);
    onUpdate({ equipped: newEquipped });
    setActiveSlot(null);
    await saveCapabilities(newEquipped);
  };

  const handleUnequip = async (slot, e) => {
    e.stopPropagation();
    const newEquipped = { ...equipped, [slot]: null };
    setEquipped(newEquipped);
    onUpdate({ equipped: newEquipped });
    await saveCapabilities(newEquipped);
  };

  return (
    <>
      <div style={{ flex: 1, position: 'relative', minHeight: 400, paddingBottom: 50 }}>
        <ConnectionLines equipped={equipped} />
        <CentralAgentNode agent={agent} />
        {Object.entries(SLOT_CONFIG).map(([slotKey, config]) => (
          <EquipmentSlot
            key={slotKey}
            slotKey={slotKey}
            config={config}
            equipped={equipped}
            activeSlot={activeSlot}
            setActiveSlot={setActiveSlot}
            handleUnequip={handleUnequip}
          />
        ))}

        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'var(--surface)', borderTop: '1px solid var(--hairline)',
          padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12,
          fontSize: 11, zIndex: 3
        }}>
          <span style={{ fontWeight: 700, color: 'var(--ink-soft)' }}>Active Runtime Tools:</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, overflowY: 'auto', maxHeight: 36 }}>
            {debugTools.length === 0 ? (
              <span style={{ color: 'var(--ink-faint)', fontStyle: 'italic' }}>None (standard prompt commands only)</span>
            ) : (
              debugTools.map(t => (
                <span key={t} style={{
                  background: 'var(--surface-2)', border: '1px solid var(--hairline)',
                  padding: '2px 8px', borderRadius: 4, fontFamily: 'monospace',
                  fontSize: 10, color: 'var(--accent-ink)'
                }}>{t}</span>
              ))
            )}
          </div>
        </div>
      </div>

      <SelectionSidebar
        activeSlot={activeSlot}
        equipped={equipped}
        setActiveSlot={setActiveSlot}
        handleEquip={handleEquip}
      />
    </>
  );
}
