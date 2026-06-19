import React from 'react';
import { api } from '../../lib/api.js';

export function ProjectSelector({ currentProject, onOpenLocalProject, onClose }) {
  const [openingProject, setOpeningProject] = React.useState(false);
  const [projectPath, setProjectPath] = React.useState(currentProject?.path || '');
  const [projectNameInput, setProjectNameInput] = React.useState(currentProject?.name || '');
  const [projectError, setProjectError] = React.useState('');
  const [projectsList, setProjectsList] = React.useState([]);
  const projectInputRef = React.useRef(null);

  React.useEffect(() => {
    api.getProjects().then(list => {
      setProjectsList(list || []);
    }).catch(err => {
      console.error('Failed to load projects:', err);
    });
  }, []);

  React.useEffect(() => {
    if (openingProject) setTimeout(() => projectInputRef.current?.focus(), 30);
  }, [openingProject]);

  const commitOpenProject = async () => {
    const path = projectPath.trim();
    if (!path) return;
    setProjectError('');
    try {
      await onOpenLocalProject?.({
        path,
        name: projectNameInput.trim() || undefined,
      });
      setOpeningProject(false);
      onClose();
    } catch (err) {
      setProjectError(err.message || 'Failed to open project');
    }
  };

  return (
    <>
      <div style={{ padding: '6px 10px 4px', display: 'grid', gap: 6 }}>
        <div style={{ fontSize: 10, fontWeight: 650, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Select Project
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <select
            value={currentProject?.projectId || ''}
            onChange={(e) => {
              const selected = projectsList.find(p => p.id === e.target.value);
              if (selected) {
                onOpenLocalProject?.({ path: selected.path, name: selected.name });
                onClose();
              }
            }}
            style={{
              flex: 1,
              padding: '6px 8px',
              borderRadius: 6,
              border: '1px solid var(--hairline)',
              background: 'var(--surface-2)',
              color: 'var(--ink)',
              fontSize: 12,
              fontFamily: 'var(--font-sans)',
              cursor: 'pointer',
              outline: 'none',
              minWidth: 0,
            }}
          >
            <option value="" disabled>-- Choose a project --</option>
            {projectsList.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            title="Open/Add another folder"
            onClick={() => setOpeningProject(o => !o)}
            style={{
              all: 'unset',
              cursor: 'pointer',
              width: 28,
              height: 28,
              borderRadius: 6,
              display: 'grid',
              placeItems: 'center',
              background: openingProject ? 'var(--accent-soft)' : 'var(--surface-2)',
              border: '1px solid var(--hairline)',
              color: openingProject ? 'var(--accent-ink)' : 'var(--ink-soft)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5v14" />
            </svg>
          </button>
        </div>
      </div>

      {openingProject && (
        <div style={{ padding: '6px 8px 8px', display: 'grid', gap: 6, borderTop: '1px solid var(--hairline)', marginTop: 4 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-soft)' }}>Add/Open Local Path</div>
          <input
            ref={projectInputRef}
            value={projectPath}
            onChange={e => setProjectPath(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') commitOpenProject();
              if (e.key === 'Escape') { setOpeningProject(false); setProjectError(''); }
            }}
            placeholder="C:\path\to\your\project"
            style={{ all: 'unset', border: '1px solid var(--hairline)', background: 'var(--surface-2)', borderRadius: 6, padding: '6px 8px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink)' }}
          />
          <input
            value={projectNameInput}
            onChange={e => setProjectNameInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') commitOpenProject();
              if (e.key === 'Escape') { setOpeningProject(false); setProjectError(''); }
            }}
            placeholder="Project name (optional)"
            style={{ all: 'unset', border: '1px solid var(--hairline)', background: 'var(--surface-2)', borderRadius: 6, padding: '6px 8px', fontSize: 11, color: 'var(--ink)' }}
          />
          {projectError && <div style={{ color: 'var(--ps-red)', fontSize: 11, lineHeight: 1.35 }}>{projectError}</div>}
          <button onClick={commitOpenProject} disabled={!projectPath.trim()} style={{ all: 'unset', cursor: projectPath.trim() ? 'pointer' : 'not-allowed', padding: '7px 10px', borderRadius: 7, background: 'var(--accent)', color: 'white', fontSize: 11, fontWeight: 700, textAlign: 'center', opacity: projectPath.trim() ? 1 : 0.45 }}>Use this folder</button>
        </div>
      )}
    </>
  );
}
