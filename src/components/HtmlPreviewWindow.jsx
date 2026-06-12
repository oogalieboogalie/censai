import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Icon } from './Icons.jsx';
import { WindowTitle } from './Windows.jsx';
import { useWorkspaceStore } from '../lib/store.js';

// Injected into the previewed document so it can stream its own live DOM out to
// the parent. The same-origin policy stops the parent from reading a sandboxed
// frame's DOM — but the frame may postMessage OUT, which crosses the boundary by
// design. So the frame stays opaque/sandboxed (no allow-same-origin, no parent
// access to our cookies/store) and simply volunteers a pretty-printed snapshot of
// itself on load + on every mutation (debounced). The Code-in-3D sink consumes it
// as `win.domSnapshot`. Inert when nothing is listening.
const DOM_STREAM_SCRIPT = `<script>(function(){
  var VOID={area:1,base:1,br:1,col:1,embed:1,hr:1,img:1,input:1,link:1,meta:1,param:1,source:1,track:1,wbr:1};
  function ser(node,depth,out){
    var pad=new Array(depth+1).join('  ');
    if(node.nodeType===3){var t=node.textContent.replace(/\\s+/g,' ').trim();if(t)out.push(pad+t);return;}
    if(node.nodeType===8){var c=node.textContent.trim();if(c)out.push(pad+'<!-- '+c+' -->');return;}
    if(node.nodeType!==1)return;
    var tag=node.tagName.toLowerCase(),attrs='';
    for(var i=0;i<node.attributes.length;i++){var a=node.attributes[i];attrs+=' '+a.name+(a.value?'=\"'+a.value+'\"':'');}
    if(tag==='script'||tag==='style'){out.push(pad+'<'+tag+attrs+'>…</'+tag+'>');return;}
    if(VOID[tag]){out.push(pad+'<'+tag+attrs+'>');return;}
    var kids=node.childNodes;
    if(kids.length===0){out.push(pad+'<'+tag+attrs+'></'+tag+'>');return;}
    if(kids.length===1&&kids[0].nodeType===3){var tt=kids[0].textContent.replace(/\\s+/g,' ').trim();out.push(pad+'<'+tag+attrs+'>'+tt+'</'+tag+'>');return;}
    out.push(pad+'<'+tag+attrs+'>');
    for(var j=0;j<kids.length;j++)ser(kids[j],depth+1,out);
    out.push(pad+'</'+tag+'>');
  }
  var MAX=200000;
  function snapshot(){var out=[];ser(document.documentElement,0,out);var s=out.join('\\n');if(s.length>MAX)s=s.slice(0,MAX)+'\\n… (truncated)';try{parent.postMessage({source:'glyph3d-dom',html:s},'*');}catch(e){}}
  var t=null;function schedule(){if(t)return;t=setTimeout(function(){t=null;snapshot();},150);}
  if(document.readyState!=='loading')schedule();else document.addEventListener('DOMContentLoaded',schedule);
  addEventListener('message',function(e){if(e.data&&e.data.source==='glyph3d-req')schedule();});
  try{new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true,attributes:true,characterData:true});}catch(e){}
})();</script>`;

export function HtmlPreviewWindow({ win, onUpdate }) {
  const iframeRef = React.useRef(null);

  // Only stream the DOM into the store while this preview is wired into a
  // Code-in-3D sink — keeps the snapshot out of persisted state otherwise.
  const watched = useWorkspaceStore(useShallow((s) =>
    s.links.some((l) => l.fromId === win.id && s.wins.some((w) => w.id === l.toId && w.kind === 'code3d'))
  ));

  React.useEffect(() => {
    if (!watched) return;
    const onMsg = (e) => {
      if (e.source !== iframeRef.current?.contentWindow) return;
      if (e.data?.source !== 'glyph3d-dom') return;
      onUpdate?.({ domSnapshot: e.data.html });
    };
    window.addEventListener('message', onMsg);
    // Ask the frame for an immediate snapshot (covers wiring up an already-loaded page).
    iframeRef.current?.contentWindow?.postMessage({ source: 'glyph3d-req' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, [watched, onUpdate]);

  const [html, setHtml] = React.useState(win.html || '');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (win.html || !win.filePath) return;
    setLoading(true);
    setError('');
    const url = win.isGithub
      ? `/api/github/file?repo=${encodeURIComponent(win.githubRepo)}&path=${encodeURIComponent(win.filePath)}`
      : `/api/files/content?path=${encodeURIComponent(win.filePath)}`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setHtml(data.content || '');
        onUpdate?.({ html: data.content || '' });
      })
      .catch(err => setError(err.message || 'Failed to load HTML'))
      .finally(() => setLoading(false));
  }, [win.filePath, win.githubRepo, win.html, win.isGithub, onUpdate]);

  return (
    <>
      <WindowTitle
        accent="var(--accent)"
        icon={<Icon.Files size={14} />}
        label="HTML Preview"
        subtitle={win.fileName || 'untitled.html'}
        attachedAgentIds={win.attachedAgents}
        onDetach={(id) => onUpdate?.({ attachedAgents: (win.attachedAgents || []).filter(a => a !== id) })}
      />
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'white' }}>
        {loading && (
          <div style={{ padding: 16, color: 'var(--ink-faint)', background: 'var(--surface)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
            Loading HTML preview...
          </div>
        )}
        {error && (
          <div style={{ padding: 16, color: 'var(--ps-red)', background: 'var(--surface)', fontSize: 12 }}>
            {error}
          </div>
        )}
        {!loading && !error && (
          <iframe
            ref={iframeRef}
            title={win.fileName || 'HTML preview'}
            srcDoc={html + DOM_STREAM_SCRIPT}
            sandbox="allow-scripts allow-forms allow-popups allow-modals"
            style={{ flex: 1, width: '100%', border: 0, display: 'block', background: 'white' }}
          />
        )}
      </div>
    </>
  );
}
