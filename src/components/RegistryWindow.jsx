// src/components/RegistryWindow.jsx
//
// D4 of the marketplace/registry push. Four tabs:
//   Browse     — paginated REST list of cards. Install button per row.
//   Installed  — local workspace-scoped installed set. Call / Uninstall.
//   Publish    — form to create a new card via REST.
//   Activity   — live WS feed of events for the installed cards.
//
// Transport: a single facade (src/lib/agentRegistry/client.js) wraps D2
// (REST) + D3 (WS) + a local install set. Tests inject a mock client
// via the `client` prop. Each tab is a separate file in ./registry/.

import React from 'react';
import { Icon } from './Icons.jsx';
import { WindowTitle } from './windows/WindowTitle.jsx';
import { createRegistryClient } from '../lib/agentRegistry/client.js';
import { BrowseTab } from './registry/BrowseTab.jsx';
import { InstalledTab } from './registry/InstalledTab.jsx';
import { PublishTab } from './registry/PublishTab.jsx';
import { ActivityTab } from './registry/ActivityTab.jsx';

const TABS = [
  { id: 'browse',    label: 'Browse',    icon: 'Search'  },
  { id: 'installed', label: 'Installed', icon: 'Plug'    },
  { id: 'publish',   label: 'Publish',   icon: 'Plus'    },
  { id: 'activity',  label: 'Activity',  icon: 'History' },
];

function TabBar({ active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6, padding: '8px 14px', borderBottom: '1px solid var(--hairline)', background: 'var(--surface-2)', flexShrink: 0 }}>
      {TABS.map((t) => {
        const Glyph = Icon[t.icon];
        return (
          <button
            key={t.id}
            type="button"
            data-testid={`registry-tab-${t.id}`}
            onClick={() => onChange(t.id)}
            style={{
              all: 'unset', cursor: 'pointer', padding: '6px 12px', borderRadius: 7,
              fontSize: 12, fontWeight: 650, display: 'inline-flex', alignItems: 'center', gap: 6,
              color: active === t.id ? 'var(--accent-ink)' : 'var(--ink-soft)',
              background: active === t.id ? 'var(--accent-soft)' : 'transparent',
            }}
          >
            {Glyph ? <Glyph size={13} /> : null}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export function RegistryWindow({ win, onUpdate, client: clientProp }) {
  const client = React.useMemo(() => clientProp || createRegistryClient(), [clientProp]);
  const [activeTab, setActiveTab] = React.useState('browse');
  const [installed, setInstalled] = React.useState(() => client.listInstalled());
  const [activity, setActivity] = React.useState([]);
  const [error, setError] = React.useState('');
  const subsRef = React.useRef(new Set());
  const callsRef = React.useRef(new Set());

  const refreshInstalled = React.useCallback(() => {
    const next = client.listInstalled();
    setInstalled(next);
    if (onUpdate) onUpdate({ installedSnapshot: Object.keys(next) });
    return next;
  }, [client, onUpdate]);

  // Subscribe to installed cards' WS events. One subscription per card;
  // teardown on unmount or when the installed set changes.
  React.useEffect(() => {
    const offs = [];
    for (const cardId of Object.keys(installed)) {
      try {
        const off = client.subscribeToCard(cardId, (event) => {
          setActivity((prev) => [...prev, { ...event, cardId, ts: new Date().toISOString() }].slice(-200));
        });
        offs.push(off);
        subsRef.current.add(off);
      } catch (err) {
        setError(`subscribe failed for ${cardId}: ${err.message}`);
      }
    }
    return () => {
      for (const off of offs) { try { off(); } catch { /* noop */ } }
    };
  }, [client, installed]);

  React.useEffect(() => () => {
    for (const off of subsRef.current) { try { off(); } catch { /* noop */ } }
    subsRef.current.clear();
    for (const iter of callsRef.current) { try { iter.return?.(); } catch { /* noop */ } }
    callsRef.current.clear();
    try { client.closeSocket?.(); } catch { /* noop */ }
  }, [client]);

  const handleCall = (cardId) => {
    (async () => {
      let iter;
      try {
        iter = client.callCard(cardId, { message: 'hello from registry window' });
        callsRef.current.add(iter);
        for await (const event of iter) {
          setActivity((prev) => [...prev, { ...event, cardId, ts: new Date().toISOString() }].slice(-200));
        }
      } catch (err) {
        setError(`call failed for ${cardId}: ${err.message}`);
      } finally {
        if (iter) callsRef.current.delete(iter);
      }
    })();
  };

  const handlePublished = (card) => {
    if (!card) return;
    // Auto-install in this workspace so the user can immediately call it.
    client.installCard(card.id);
    refreshInstalled();
    setActiveTab('installed');
  };

  return (
    <>
      <WindowTitle
        icon={<Icon.Plug size={14} />}
        label={win?.title || 'Agent Registry'}
        subtitle="browse · install · publish · monitor"
      />
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--surface)', overflow: 'hidden' }}>
        <TabBar active={activeTab} onChange={setActiveTab} />
        {error && <div data-testid="registry-error-banner" style={{ color: 'var(--ps-red)', fontSize: 12, padding: '6px 12px', borderBottom: '1px solid var(--hairline)' }}>{error}</div>}
        {activeTab === 'browse'    && <BrowseTab    client={client} installed={installed} onInstalledChange={refreshInstalled} />}
        {activeTab === 'installed' && <InstalledTab client={client} installed={installed} onInstalledChange={refreshInstalled} onCall={handleCall} />}
        {activeTab === 'publish'   && <PublishTab   client={client} onPublished={handlePublished} />}
        {activeTab === 'activity'  && <ActivityTab  events={activity} />}
      </div>
    </>
  );
}

export default RegistryWindow;