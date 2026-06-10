import { useState, useEffect } from 'react';
import { WindowTitle } from './windows/WindowTitle.jsx';
import { Icon } from './Icons.jsx';

export function AutomationWindow({ win, onUpdate }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/automation/status');
      if (!res.ok) {
        throw new Error('Failed to fetch status');
      }
      const data = await res.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }, []);

  const handleAction = async (task, action) => {
    try {
      const res = await fetch(`/api/automation/${task}/${action}`, { method: 'POST' });
      if (!res.ok) {
        throw new Error(`Failed to ${action} ${task}`);
      }
      // Optimistically fetch status after action
      fetchStatus();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return 'Never';
    return new Date(timeStr).toLocaleString();
  };

  const getStatusColor = (state, result) => {
    if (state === 'Running') return 'var(--ps-blue)';
    if (state === 'Ready' && result === 0) return 'var(--ps-green)';
    if (result && result !== 0) return 'var(--ps-red)';
    if (state === 'Disabled') return 'var(--ink-faint)';
    return 'var(--ink-soft)';
  };

  if (loading && !status) {
    return (
      <>
        <WindowTitle
          icon={<Icon.Server size={14} />}
          label={win.title || 'Automation Board'}
        />
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--ink-faint)' }}>
          Loading status...
        </div>
      </>
    );
  }

  if (error && !status) {
    return (
      <>
        <WindowTitle
          icon={<Icon.Server size={14} />}
          label={win.title || 'Automation Board'}
        />
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--ps-red)' }}>
          {error}
        </div>
      </>
    );
  }

  const tasks = status ? Object.keys(status) : [];

  return (
    <>
      <WindowTitle
        icon={<Icon.Server size={14} />}
        label={win.title || 'Automation Board'}
        subtitle="Scheduled Tasks"
      />
      <div style={{ flex: 1, minHeight: 0, padding: 14, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--surface)' }}>
        {tasks.map(task => {
          const info = status[task];
          const isArmed = info.armed;
          const isRunning = info.state === 'Running';
          const isDisabled = info.state === 'Disabled';
          const statusColor = getStatusColor(info.state, info.lastTaskResult);

          return (
            <div key={task} style={{ background: 'var(--surface-2)', border: '1px solid var(--hairline)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, boxShadow: `0 0 8px ${statusColor}` }} />
                    {task}
                  </h3>
                  <div style={{ marginTop: 4, fontSize: 12, color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)' }}>
                    State: <span style={{ color: 'var(--ink)' }}>{info.state}</span>
                    {!isArmed && ' (Not Armed)'}
                  </div>
                </div>
                {isArmed && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    {isDisabled ? (
                      <button
                        onClick={() => handleAction(task, 'enable')}
                        style={{ all: 'unset', cursor: 'pointer', padding: '6px 12px', borderRadius: 8, background: 'var(--accent)', fontSize: 12, fontWeight: 600, color: 'white' }}
                      >
                        Resume
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAction(task, 'disable')}
                        style={{ all: 'unset', cursor: 'pointer', padding: '6px 12px', borderRadius: 8, border: '1px solid var(--hairline)', background: 'var(--surface)', fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}
                      >
                        Pause
                      </button>
                    )}
                    <button
                      onClick={() => handleAction(task, 'run')}
                      disabled={isRunning}
                      style={{ all: 'unset', cursor: isRunning ? 'wait' : 'pointer', padding: '6px 12px', borderRadius: 8, border: '1px solid var(--hairline)', background: 'var(--surface)', fontSize: 12, fontWeight: 600, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 6, opacity: isRunning ? 0.6 : 1 }}
                    >
                      <Icon.Play size={12} />
                      Run Now
                    </button>
                  </div>
                )}
              </div>

              {isArmed ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 4 }}>
                  <div style={{ background: 'var(--surface)', padding: 10, borderRadius: 8, border: '1px solid var(--hairline)' }}>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 4, letterSpacing: '0.05em' }}>Last Run</div>
                    <div style={{ fontSize: 12, color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>{formatTime(info.lastRunTime)}</div>
                    {info.lastTaskResult !== null && (
                      <div style={{ fontSize: 11, color: info.lastTaskResult === 0 ? 'var(--ps-green)' : 'var(--ps-red)', marginTop: 2 }}>
                        Result: {info.lastTaskResult}
                      </div>
                    )}
                  </div>
                  <div style={{ background: 'var(--surface)', padding: 10, borderRadius: 8, border: '1px solid var(--hairline)' }}>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 4, letterSpacing: '0.05em' }}>Next Run</div>
                    <div style={{ fontSize: 12, color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>{formatTime(info.nextRunTime)}</div>
                  </div>
                  <div style={{ background: 'var(--surface)', padding: 10, borderRadius: 8, border: '1px solid var(--hairline)' }}>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 4, letterSpacing: '0.05em' }}>Queue Status</div>
                    <div style={{ fontSize: 12, color: 'var(--ink)' }}>
                      Pending: {info.pending || 0}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink)' }}>
                      Dispatched: {info.dispatched || 0}
                    </div>
                  </div>
                </div>
              ) : (
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginTop: 4 }}>
                   <div style={{ background: 'var(--surface)', padding: 10, borderRadius: 8, border: '1px solid var(--hairline)' }}>
                     <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 4, letterSpacing: '0.05em' }}>Queue Status</div>
                     <div style={{ fontSize: 12, color: 'var(--ink)' }}>
                       Pending: {info.pending || 0}
                     </div>
                     <div style={{ fontSize: 12, color: 'var(--ink)' }}>
                       Dispatched: {info.dispatched || 0}
                     </div>
                   </div>
                 </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
