import React from 'react';
import { SchedulerAgentSelect } from './SchedulerAgentSelect.jsx';
import { SchedulerProjectOptions } from './SchedulerProjectOptions.jsx';
import { SchedulerDateTimeForm } from './SchedulerDateTimeForm.jsx';
import { Icon } from '../Icons.jsx';

export function SchedulerForm({ state }) {
  const {
    selectedAgentId, setSelectedAgentId,
    taskText, setTaskText,
    documentTarget, setDocumentTarget,
    createGithubImmediately, setCreateGithubImmediately,
    githubRepo, setGithubRepo,
    submittingGithub, githubStatus,
    handleAddSchedule
  } = state;

  return (
    <div style={{
      width: 320,
      borderRight: '1px solid var(--hairline)',
      background: 'var(--surface-50)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--hairline)', background: 'var(--surface-2)' }}>
        <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>New Scheduled Task</h3>
      </div>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto' }}>
        <SchedulerAgentSelect selectedAgentId={selectedAgentId} setSelectedAgentId={setSelectedAgentId} />
        <SchedulerProjectOptions state={state} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Document Target (optional)</span>
          <input
            type="text"
            placeholder="e.g. week-32.md"
            value={documentTarget}
            onChange={(e) => setDocumentTarget(e.target.value)}
            style={{
              width: '100%', padding: '8px 10px', borderRadius: 8,
              border: '1px solid var(--hairline)', background: 'var(--surface-2)',
              color: 'var(--ink)', fontSize: 13, outline: 'none'
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Task Description</span>
          <textarea
            placeholder="Describe the task for the agent to execute..."
            value={taskText}
            onChange={(e) => setTaskText(e.target.value)}
            rows={3}
            style={{
              width: '100%', padding: '8px 10px', borderRadius: 8,
              border: '1px solid var(--hairline)', background: 'var(--surface-2)',
              color: 'var(--ink)', fontSize: 13, outline: 'none', resize: 'none', fontFamily: 'inherit'
            }}
          />
        </div>

        <SchedulerDateTimeForm state={state} />

        {selectedAgentId === 'jules' && (
          <div style={{ border: '1px solid var(--accent)', borderRadius: 10, padding: 10, display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--accent-soft)' }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={createGithubImmediately}
                onChange={(e) => setCreateGithubImmediately(e.target.checked)}
              />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-ink)' }}>Create GitHub Issue Automatically</span>
            </label>
            {createGithubImmediately && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, animation: 'gen-fade 0.2s ease' }}>
                <input
                  type="text"
                  placeholder="e.g. myorg/myrepo"
                  value={githubRepo}
                  onChange={(e) => setGithubRepo(e.target.value)}
                  style={{
                    width: '100%', padding: '6px 8px', borderRadius: 6,
                    border: '1px solid var(--accent)', background: 'var(--surface)',
                    color: 'var(--ink)', fontSize: 11, outline: 'none'
                  }}
                />
                {githubStatus && (
                  <div style={{ fontSize: 10, color: githubStatus.type === 'error' ? 'var(--ps-red)' : githubStatus.type === 'success' ? 'var(--ps-green)' : 'var(--accent-ink)' }}>
                    {githubStatus.text}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleAddSchedule}
          disabled={!taskText.trim() || submittingGithub}
          style={{
            all: 'unset', cursor: !taskText.trim() || submittingGithub ? 'not-allowed' : 'pointer',
            padding: '10px 16px', borderRadius: 8,
            background: 'var(--accent)', color: 'white',
            fontSize: 13, fontWeight: 700, textAlign: 'center',
            opacity: !taskText.trim() || submittingGithub ? 0.5 : 1,
            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6,
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          {submittingGithub ? 'Creating...' : <><Icon.Plus size={16} /> Schedule Task</>}
        </button>
      </div>
    </div>
  );
}
