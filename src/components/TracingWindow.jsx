import React from 'react';
import { Icon } from './Icons.jsx';
import { WindowTitle } from './Windows.jsx';
import { fmtTime } from './operations/OperationsShared.jsx';

export function TracingWindow({ win, onUpdate }) {
  const [traces, setTraces] = React.useState([]);
  const [selectedTraceId, setSelectedTraceId] = React.useState(null);
  const [events, setEvents] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  const loadTraces = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/operational-intelligence/traces');
      const data = await res.json();
      setTraces(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load traces:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadEvents = React.useCallback(async (id) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/operational-intelligence/traces/${id}/events`);
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
      setSelectedTraceId(id);
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const convertToTest = async (id) => {
    try {
      const res = await fetch(`/api/operational-intelligence/traces/${id}/convert-to-test`, { method: 'POST' });
      if (res.ok) {
        alert('Successfully converted to regression test case.');
      } else {
        const data = await res.json();
        alert(`Failed: ${data.error}`);
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  React.useEffect(() => {
    loadTraces();
  }, [loadTraces]);

  const selectedTrace = traces.find(t => t.id === selectedTraceId);

  return (
    <>
      <WindowTitle
        icon={<Icon.Search size={14} />}
        label={win.title || 'Agentic Tracing'}
        attachedAgentIds={win.attachedAgents}
        onDetach={(id) => onUpdate?.({ attachedAgents: (win.attachedAgents || []).filter(a => a !== id) })}
      >
        <button type="button" onClick={loadTraces} disabled={loading} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
          <Icon.Refresh size={12} />
        </button>
      </WindowTitle>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '250px 1fr', overflow: 'hidden', background: 'var(--surface)', color: 'var(--ink)' }}>
        <div style={{ borderRight: '1px solid var(--accent-soft)', overflowY: 'auto', padding: '8px' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', opacity: 0.7 }}>Recent Traces</h4>
          {traces.map(t => (
            <div
              key={t.id}
              onClick={() => loadEvents(t.id)}
              style={{
                padding: '8px',
                cursor: 'pointer',
                borderRadius: '4px',
                marginBottom: '4px',
                fontSize: '11px',
                background: selectedTraceId === t.id ? 'var(--accent-soft)' : 'transparent',
                border: '1px solid var(--accent-soft)',
              }}
            >
              <div style={{ fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</div>
              <div style={{ opacity: 0.6 }}>{fmtTime(new Date(t.created_at))}</div>
              <div style={{ marginTop: '4px' }}>
                <span style={{
                  padding: '1px 4px',
                  borderRadius: '3px',
                  fontSize: '9px',
                  background: t.data.status === 'failed' ? '#fee2e2' : '#dcfce7',
                  color: t.data.status === 'failed' ? '#991b1b' : '#166534'
                }}>
                  {t.data.status}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ overflowY: 'auto', padding: '12px' }}>
          {selectedTrace ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--accent-soft)', paddingBottom: '8px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '14px' }}>{selectedTrace.title}</h3>
                  <div style={{ fontSize: '11px', opacity: 0.7 }}>ID: {selectedTrace.id}</div>
                </div>
                <button
                  onClick={() => convertToTest(selectedTrace.id)}
                  style={{
                    background: 'var(--accent)',
                    color: 'white',
                    border: 'none',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  Convert to Regression Test
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px', marginBottom: '16px' }}>
                <div style={{ padding: '8px', background: 'var(--accent-soft)', borderRadius: '4px' }}>
                  <div style={{ fontSize: '9px', opacity: 0.6, textTransform: 'uppercase' }}>Agent</div>
                  <div style={{ fontSize: '12px' }}>{selectedTrace.data.agentId}</div>
                </div>
                <div style={{ padding: '8px', background: 'var(--accent-soft)', borderRadius: '4px' }}>
                  <div style={{ fontSize: '9px', opacity: 0.6, textTransform: 'uppercase' }}>Window</div>
                  <div style={{ fontSize: '12px' }}>{selectedTrace.data.windowId || 'N/A'}</div>
                </div>
                {selectedTrace.data.timings && (
                  <div style={{ padding: '8px', background: 'var(--accent-soft)', borderRadius: '4px' }}>
                    <div style={{ fontSize: '9px', opacity: 0.6, textTransform: 'uppercase' }}>Total Duration</div>
                    <div style={{ fontSize: '12px' }}>{selectedTrace.data.timings.total_ms}ms</div>
                  </div>
                )}
              </div>

              <h4 style={{ fontSize: '12px', borderBottom: '1px solid var(--accent-soft)', paddingBottom: '4px' }}>Execution Timeline</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {events.map((e, idx) => (
                  <div key={e.id} style={{ padding: '8px', borderLeft: '2px solid var(--accent)', background: 'var(--surface-soft)', borderRadius: '0 4px 4px 0', fontSize: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 'bold', color: 'var(--accent)' }}>{e.event_type}</span>
                      <span style={{ fontSize: '10px', opacity: 0.6 }}>{fmtTime(new Date(e.created_at))}</span>
                    </div>
                    {e.event_type === 'agent.round' && (
                      <div>
                        <div>Round: {e.payload.round}</div>
                        <div style={{ fontSize: '11px', opacity: 0.8 }}>
                          Model: {e.payload.modelConfig?.model} | Messages: {e.payload.messagesCount} | Tools: {e.payload.toolsAvailableCount}
                        </div>
                      </div>
                    )}
                    {e.event_type === 'tool.invocation' && (
                      <div>
                        <div style={{ fontWeight: '500' }}>{e.payload.toolName}({JSON.stringify(e.payload.args)})</div>
                        <div style={{
                          marginTop: '4px',
                          padding: '4px',
                          background: 'rgba(0,0,0,0.05)',
                          borderRadius: '2px',
                          fontSize: '11px',
                          maxHeight: '100px',
                          overflowY: 'auto',
                          fontFamily: 'monospace'
                        }}>
                          {typeof e.payload.resultPreview === 'string' ? e.payload.resultPreview : JSON.stringify(e.payload.resultPreview)}
                        </div>
                        <div style={{ fontSize: '10px', marginTop: '4px', color: e.payload.ok ? '#166534' : '#991b1b' }}>
                          {e.payload.ok ? '✓ Success' : '✗ Failed'} ({e.payload.ms}ms)
                        </div>
                      </div>
                    )}
                    {e.event_type === 'session.failure' && (
                      <div style={{ color: '#991b1b' }}>
                        <div style={{ fontWeight: 'bold' }}>Failure: {e.payload.error}</div>
                        <pre style={{ fontSize: '10px', overflowX: 'auto', background: 'rgba(0,0,0,0.05)', padding: '4px' }}>{e.payload.stack}</pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
              Select a trace to view details
            </div>
          )}
        </div>
      </div>
    </>
  );
}
