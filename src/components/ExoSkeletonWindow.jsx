import React from 'react';
import { WindowTitle } from './Windows.jsx';
import { getAgents, getAgentById } from '../lib/agentStore.js';
import { api } from '../lib/api.js';
import { ExoSkeletonModules, MODULE_CAPABILITIES } from './ExoSkeletonModules.jsx';
import { ExoSkeletonAttributes } from './ExoSkeletonAttributes.jsx';

export function ExoSkeletonWindow({ win, onUpdate }) {
  const selectedAgentId = win.attachedAgents?.[0] || '1'; // Default to first agent if none attached
  const agent = getAgentById(selectedAgentId) || getAgents()[0];

  const [activeTab, setActiveTab] = React.useState('modules'); // 'modules' or 'attributes'
  const [equipped, setEquipped] = React.useState({ head: null, mainHand: null, offHand: null, trinket: null });
  const [debugTools, setDebugTools] = React.useState([]);

  // Attributes state
  const [allAttributes, setAllAttributes] = React.useState([]);
  const [equippedAttributes, setEquippedAttributes] = React.useState([]);
  const [previewPrompt, setPreviewPrompt] = React.useState('');

  // Fetch capabilities and attributes on mount/agent change
  React.useEffect(() => {
    let active = true;
    const loadCapabilitiesAndAttributes = async () => {
      if (!agent?.id) return;
      try {
        // 1. Fetch modules / capabilities
        const res = await api.getAgentCapabilities(agent.id);
        if (!active) return;
        const caps = res?.capabilities || [];
        
        const nextEquipped = { head: null, mainHand: null, offHand: null, trinket: null };
        caps.forEach(cap => {
          const slot = cap.equipped_slot;
          if (slot && nextEquipped[slot] !== undefined) {
            const moduleId = Object.keys(MODULE_CAPABILITIES).find(
              id => MODULE_CAPABILITIES[id].capability_id === cap.capability_id
            );
            if (moduleId) {
              nextEquipped[slot] = moduleId;
            }
          }
        });
        setEquipped(nextEquipped);
        
        // 2. Fetch runtime debug tools
        const debugRes = await api.getAgentDebugTools(agent.id);
        if (!active) return;
        setDebugTools(debugRes?.tools || []);

        // 3. Fetch all available attributes
        const attrsRes = await api.getAttributes();
        if (!active) return;
        setAllAttributes(attrsRes?.attributes || []);

        // 4. Fetch agent equipped attributes
        const equippedAttrsRes = await api.getAgentAttributes(agent.id);
        if (!active) return;
        const eqAttrs = equippedAttrsRes?.attributes || [];
        setEquippedAttributes(eqAttrs);

        // 5. Compile prompt preview
        const template = agent.system_prompt || '';
        const previewRes = await api.compilePromptPreview(agent.id, template, eqAttrs);
        if (!active) return;
        setPreviewPrompt(previewRes?.compiled || '');

      } catch (err) {
        console.error('Failed to load agent capabilities or attributes:', err);
      }
    };

    loadCapabilitiesAndAttributes();
    return () => {
      active = false;
    };
  }, [agent?.id]);

  const saveCapabilities = async (equippedMap) => {
    if (!agent?.id) return;
    try {
      const capsToSave = Object.entries(equippedMap)
        .map(([s, modId]) => {
          if (!modId) return null;
          const map = MODULE_CAPABILITIES[modId];
          if (!map) return null;
          return {
            capability_id: map.capability_id,
            mode: map.mode,
            equipped_slot: s
          };
        })
        .filter(Boolean);

      await api.saveAgentCapabilities(agent.id, capsToSave);
      
      // Refresh debug tools
      const debugRes = await api.getAgentDebugTools(agent.id);
      setDebugTools(debugRes?.tools || []);
    } catch (err) {
      console.error('Failed to sync agent capabilities:', err);
    }
  };

  const handleToggleAttribute = async (attrId) => {
    if (!agent?.id) return;
    const isEquipped = equippedAttributes.includes(attrId);
    const nextEquipped = isEquipped 
      ? equippedAttributes.filter(id => id !== attrId)
      : [...equippedAttributes, attrId];
    
    setEquippedAttributes(nextEquipped);

    // Save equipped attributes to backend
    await api.saveAgentAttributes(agent.id, nextEquipped);

    // Update live prompt preview
    const template = agent.system_prompt || '';
    const previewRes = await api.compilePromptPreview(agent.id, template, nextEquipped);
    setPreviewPrompt(previewRes?.compiled || '');
  };

  return (
    <>
      <WindowTitle
        accent="var(--ps-green)"
        icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>}
        label={win.title || "Exo-Skeleton Builder"}
        subtitle="Agent Configuration"
        attachedAgentIds={win.attachedAgents}
        onDetach={(id) => onUpdate({ attachedAgents: (win.attachedAgents || []).filter(a => a !== id) })}
      />

      {/* Premium Glassmorphic Tab Selector */}
      <div style={{
        display: 'flex', borderBottom: '1px solid var(--hairline)',
        background: 'var(--surface)', padding: '0 16px', gap: 16, zIndex: 4
      }}>
        <button
          onClick={() => setActiveTab('modules')}
          style={{
            all: 'unset', cursor: 'pointer', padding: '12px 8px', fontSize: 11, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: 1,
            color: activeTab === 'modules' ? 'var(--accent)' : 'var(--ink-soft)',
            borderBottom: activeTab === 'modules' ? '2px solid var(--accent)' : '2px solid transparent',
            transition: 'all 0.2s'
          }}
        >
          Exo-Modules
        </button>
        <button
          onClick={() => setActiveTab('attributes')}
          style={{
            all: 'unset', cursor: 'pointer', padding: '12px 8px', fontSize: 11, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: 1,
            color: activeTab === 'attributes' ? 'var(--accent)' : 'var(--ink-soft)',
            borderBottom: activeTab === 'attributes' ? '2px solid var(--accent)' : '2px solid transparent',
            transition: 'all 0.2s'
          }}
        >
          Persona Attributes
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden', background: 'var(--surface-2)' }}>
        {activeTab === 'modules' ? (
          <ExoSkeletonModules
            agent={agent}
            equipped={equipped}
            setEquipped={setEquipped}
            debugTools={debugTools}
            saveCapabilities={saveCapabilities}
            onUpdate={onUpdate}
          />
        ) : (
          <ExoSkeletonAttributes
            agent={agent}
            allAttributes={allAttributes}
            equippedAttributes={equippedAttributes}
            previewPrompt={previewPrompt}
            handleToggleAttribute={handleToggleAttribute}
          />
        )}
      </div>
    </>
  );
}
