import React from 'react';
import { Icon } from './Icons.jsx';
import { WindowTitle } from './Windows.jsx';
import { 
  useFiles, Tree, 
  FileModeSelector, LocalPathBar, GithubRepoBar, FileSearchFilter,
  LocalEmptyState, GithubRepoList 
} from './files/index.js';

export function FilesWindow({ win, pan, zoom, onUpdate, onSpawn, currentProject }) {
  const {
    mode,
    tree,
    repos,
    loading,
    error,
    pathInput,
    setPathInput,
    searchInput,
    setSearchInput,
    searchResults,
    searchLoading,
    loadDir,
    clearDir,
  } = useFiles({ win, onUpdate, currentProject });

  return (
    <>
      <WindowTitle 
        accent="var(--ps-yellow)" 
        icon={<Icon.Folder size={14}/>} 
        label="Project files" 
        subtitle={mode === 'local' ? (win.dirPath || "Local Explorer") : (win.githubRepo || "GitHub Explorer")} 
        attachedAgentIds={win.attachedAgents} 
        onDetach={(id) => onUpdate?.({ attachedAgents: (win.attachedAgents || []).filter(a => a !== id) })} 
      />

      <FileModeSelector mode={mode} onUpdate={onUpdate} />

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '8px 6px', fontFamily: 'var(--font-mono)', fontSize: 12, display: 'flex', flexDirection: 'column' }}>
        
        {mode === 'local' && win.dirPath && (
          <LocalPathBar pathInput={pathInput} setPathInput={setPathInput} loadDir={loadDir} clearDir={clearDir} />
        )}

        {mode === 'github' && win.githubRepo && (
          <GithubRepoBar githubRepo={win.githubRepo} clearDir={clearDir} />
        )}

        {(win.dirPath || win.githubRepo) && (
          <FileSearchFilter searchInput={searchInput} setSearchInput={setSearchInput} />
        )}

        {loading && <div style={{ padding: 12, color: 'var(--ink-faint)' }}>Loading...</div>}
        {error && <div style={{ padding: 12, color: 'var(--ps-red)', fontFamily: 'var(--font-sans)', fontSize: 12 }}>Error: {error}</div>}

        {mode === 'local' && !win.dirPath && (
          <LocalEmptyState pathInput={pathInput} setPathInput={setPathInput} loadDir={loadDir} />
        )}

        {mode === 'github' && !win.githubRepo && repos && (
          <GithubRepoList repos={repos} onSelect={(repoName) => onUpdate({ githubRepo: repoName })} />
        )}

        {searchResults ? (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {searchLoading && <div style={{ padding: 12, color: 'var(--ink-faint)', fontStyle: 'italic' }}>Searching...</div>}
            {!searchLoading && searchResults.length === 0 && <div style={{ padding: 12, color: 'var(--ink-faint)' }}>No matches.</div>}
            {!searchLoading && searchResults.map(node => (
               <Tree key={node.path} node={node} depth={0} pan={pan} zoom={zoom} onSpawn={onSpawn} githubRepo={mode === 'github' ? win.githubRepo : null} mode={mode} rootDirPath={win.dirPath} />
            ))}
          </div>
        ) : (
          tree && <Tree node={tree} depth={0} pan={pan} zoom={zoom} onSpawn={onSpawn} githubRepo={mode === 'github' ? win.githubRepo : null} mode={mode} rootDirPath={win.dirPath} />
        )}

        {(tree || searchResults) && (
          <div style={{ marginTop: 14, paddingLeft: 10, fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-faint)', letterSpacing: '0.08em', textTransform: 'uppercase', lineHeight: 1.5 }}>
            click opens code or docs · drag to canvas<br/>
            {mode === 'github' && 'drop image on folder to save to GitHub'}
          </div>
        )}
      </div>
    </>
  );
}
