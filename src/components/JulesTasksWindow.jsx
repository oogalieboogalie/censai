import React from 'react';
import { Icon } from './Icons.jsx';
import { WindowTitle } from './Windows.jsx';
import { api } from '../lib/api.js';

function fmtDate(value) {
  if (!value) return 'not checked';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'not checked';
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function statusColor(status) {
  if (/COMPLETE|DONE|SUCCESS/i.test(status)) return 'var(--ps-green)';
  if (/FAIL|ERROR|CANCEL/i.test(status)) return 'var(--ps-red)';
  if (/AWAITING/i.test(status)) return 'var(--ps-yellow)';
  return 'var(--ps-blue)';
}

export function JulesTasksWindow({ win }) {
  const [sessions, setSessions] = React.useState([]);
  const [includeCompleted, setIncludeCompleted] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [lastLoadedAt, setLastLoadedAt] = React.useState(null);

  const load = React.useCallback(async ({ refresh = false } = {}) => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getJulesSessions({ refresh, includeCompleted });
      setSessions(data.sessions || []);
      setLastLoadedAt(new Date());
    } catch (err) {
      setError(err.message || 'Failed to load Jules sessions');
    } finally {
      setLoading(false);
    }
  }, [includeCompleted]);

  React.useEffect(() => {
    load({ refresh: false });
  }, [load]);

  React.useEffect(() => {
    const handleTasksUpdated = () => {
      load({ refresh: true });
    };
    window.addEventListener('tasks-updated', handleTasksUpdated);
    return () => {
      window.removeEventListener('tasks-updated', handleTasksUpdated);
    };
  }, [load]);

  return (
    <>
      <WindowTitle
        icon={<Icon.Bot size={14} />}
        label={win.title || 'Jules Tasks'}
        subtitle="manual refresh"
      />
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: 12, gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={() => load({ refresh: true })}
            disabled={loading}
            style={{ all: 'unset', cursor: loading ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--hairline)', background: 'var(--surface-2)', fontSize: 12, color: 'var(--ink)' }}
          >
            <Icon.Search size={13} />
            {loading ? 'Refreshing' : 'Refresh'}
          </button>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--ink-soft)' }}>
            <input type="checkbox" checked={includeCompleted} onChange={(e) => setIncludeCompleted(e.target.checked)} />
            completed
          </label>
          <div style={{ flex: 1 }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-faint)' }}>
            {lastLoadedAt ? `loaded ${fmtDate(lastLoadedAt)}` : 'not loaded'}
          </span>
        </div>

        {error && <div style={{ color: 'var(--ps-red)', fontSize: 12 }}>{error}</div>}

        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'grid', alignContent: 'start', gap: 8 }}>
          {!loading && sessions.length === 0 && (
            <div style={{ border: '1px dashed var(--hairline)', borderRadius: 8, padding: 18, color: 'var(--ink-faint)', fontSize: 12, textAlign: 'center' }}>
              No active Jules tasks.
            </div>
          )}
          {sessions.map(session => (
            <div key={session.id || session.session} style={{ border: '1px solid var(--hairline)', borderRadius: 8, background: 'var(--surface-2)', padding: 10, display: 'grid', gap: 6 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor(session.status), boxShadow: `0 0 8px ${statusColor(session.status)}` }} />
                <strong style={{ fontSize: 13, color: 'var(--ink)' }}>{session.title}</strong>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-faint)' }}>
                <span>{session.status}</span>
                {session.projectName && <span>{session.projectName}</span>}
                {session.branch && <span>{session.branch}</span>}
                <span>checked {fmtDate(session.lastPolledAt)}</span>
              </div>
              {(session.prUrl || session.julesUrl) && (
                <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
                  {session.julesUrl && <a href={session.julesUrl} target="_blank" rel="noreferrer">Jules</a>}
                  {session.prUrl && <a href={session.prUrl} target="_blank" rel="noreferrer">PR #{session.prNumber || ''}</a>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

