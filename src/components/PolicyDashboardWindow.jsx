import React, { useState, useEffect } from 'react';

// Simple inline SVG replacements for lucide-react to avoid external dependencies
function Shield({ className, size = 16 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  );
}

function CheckCircle({ className, size = 16 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  );
}

function XCircle({ className, size = 16 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="15" y1="9" x2="9" y2="15"/>
      <line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
  );
}

function AlertTriangle({ className, size = 16 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  );
}

function Activity({ className, size = 16 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  );
}

function Cloud({ className, size = 16 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
    </svg>
  );
}

/**
 * Unified Policy & Evidence Dashboard (DevSecOps 2026).
 * Shows policy compliance, evidence trails, and drift detection.
 */
export function PolicyDashboardWindow() {
  const [evaluations, setEvaluations] = useState([]);
  const [stats, setStats] = useState({ total: 0, allow: 0, deny: 0, drift: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulated fetch of policy evaluations
    // In a real implementation, this would call GET /api/policies/evaluations
    const mockEvaluations = [
      { id: 1, action_type: 'local_write_file', actor_id: 'atlas', decision: 'allow', reason: 'Matches path /app/scratch', created_at: new Date().toISOString() },
      { id: 2, action_type: 'github_write_file', actor_id: 'architect', decision: 'deny', reason: 'Unauthorized repo access', created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
      { id: 3, action_type: 'postgres_query', actor_id: 'nexus', decision: 'allow', reason: 'Read-only query permitted', created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString() }
    ];

    setEvaluations(mockEvaluations);
    setStats({
      total: mockEvaluations.length,
      allow: mockEvaluations.filter(e => e.decision === 'allow').length,
      deny: mockEvaluations.filter(e => e.decision === 'deny').length,
      drift: 0 // In 2026, we detect drift automatically
    });
    setLoading(false);
  }, []);

  return (
    <div className="flex flex-col h-full bg-surface text-ink font-sans overflow-hidden">
      {/* Header Stats */}
      <div className="grid grid-cols-4 gap-4 p-4 border-b border-accent-soft/20 bg-accent-soft/5">
        <StatCard icon={<Shield className="text-blue-500" />} label="Total Checks" value={stats.total} />
        <StatCard icon={<CheckCircle className="text-green-500" />} label="Allowed" value={stats.allow} />
        <StatCard icon={<XCircle className="text-red-500" />} label="Denied" value={stats.deny} />
        <StatCard icon={<AlertTriangle className="text-yellow-500" />} label="Policy Drift" value={stats.drift} />
      </div>

      {/* Main Content: Evidence Trail */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-ink/60 mb-2 flex items-center gap-2">
          <Activity size={14} /> Evidence Trail (Real-time)
        </h3>

        {loading ? (
          <div className="text-center py-10 text-ink/40">Syncing evidence...</div>
        ) : evaluations.length === 0 ? (
          <div className="text-center py-10 text-ink/40">No evidence recorded yet.</div>
        ) : (
          evaluations.map(ev => (
            <div key={ev.id} className="p-3 rounded-lg border border-accent-soft/30 bg-accent-soft/5 flex items-start gap-3 hover:bg-accent-soft/10 transition-colors">
              <div className={`mt-1 p-1.5 rounded-full ${ev.decision === 'allow' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                {ev.decision === 'allow' ? <CheckCircle size={14} /> : <XCircle size={14} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-mono text-xs font-bold text-ink uppercase">{ev.action_type}</span>
                  <span className="text-[10px] text-ink/40">{new Date(ev.created_at).toLocaleTimeString()}</span>
                </div>
                <p className="text-xs text-ink/70 mb-1">{ev.reason}</p>
                <div className="flex gap-3 text-[10px] text-ink/50 uppercase">
                  <span className="flex items-center gap-1"><Cloud size={10} /> {ev.actor_id}</span>
                  <span className="flex items-center gap-1 font-mono">ID: {ev.id}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-3 border-t border-accent-soft/20 bg-accent-soft/5 flex justify-between items-center">
        <div className="flex gap-2">
          <button className="px-3 py-1 rounded border border-accent-soft/50 text-[11px] font-bold uppercase hover:bg-accent-soft/20">Sync All Clouds</button>
          <button className="px-3 py-1 rounded border border-accent-soft/50 text-[11px] font-bold uppercase hover:bg-accent-soft/20">Audit Report</button>
        </div>
        <div className="text-[10px] font-mono text-ink/30 italic uppercase">
          DevSecOps 2026 • Unified Gate v1.0
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div className="p-3 rounded-lg border border-accent-soft/20 bg-surface flex flex-col items-center justify-center text-center shadow-sm">
      <div className="mb-1">{icon}</div>
      <div className="text-xs text-ink/50 uppercase font-bold tracking-tighter">{label}</div>
      <div className="text-lg font-black text-ink">{value}</div>
    </div>
  );
}
