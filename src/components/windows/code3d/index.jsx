import React from 'react';
import * as THREE from 'three/webgpu';
import { useThree } from '@react-three/fiber';
import { useGlyphEngine, GlyphCanvas, ViewerCamera, useGlyphAtlas, useGridRegistry } from '@glyph3d/r3f';
import { CodeGrid as CodeGridCore } from '@glyph3d/core/collections';
import fontUrl from '@glyph3d/core/fonts/Cousine-Regular.ttf?url';
import { useShallow } from 'zustand/react/shallow';
import { WindowTitle } from '../WindowTitle.jsx';
import { Icon } from '../../Icons.jsx';
import { useWorkspaceStore } from '../../../lib/store.js';
import { getWindowManifest } from '../../../lib/windowManifest.js';
import { windowMeta } from './meta.js';

// Re-export co-located metadata so the discovery layer reads component + meta
// from a single import.
export { windowMeta };

// Code in 3D — a DISPLAY SINK. It renders nothing of its own; it reads the
// canvas link graph, finds whichever window is wired INTO it, adapts that
// window's live state into text, and draws it as a GPU-instanced glyph body
// (the same WebGPU/TSL stack behind glyph3d.dev). Because the workspace store
// is reactive, the 3D view updates live as the wired source mutates — drag a
// wire from an HTML Preview and watch its DOM rebuild in 3D as scripts run.

const WORLD_SCALE = 0.02;                         // world units per atlas pixel
const TEXT_COLOR = { r: 0.80, g: 0.84, b: 0.70 }; // soft parchment-green glyphs
const BG = 0x0e0c08;                              // the reels' near-black GL canvas

// ── glyph source resolution: manifest-declared, not hardcoded ─────────────────────
// A window becomes 3D-renderable by declaring `glyphSource` in its manifest:
//   glyphSource: { fields: ['msgs'], format: 'chat', filename: 'transcript.md' }
// `fields` is an ordered list of win.* keys (first non-empty wins); `format` keys
// the formatter below (turn the raw field value into display text). So adding a
// source is a one-line *manifest* opt-in — the same declarative model the canvas
// uses to discover windows — and new shapes are one formatter here, not a per-kind
// adapter. The sink never learns about specific window kinds.
const FORMATTERS = {
  text: (v) => (v == null ? '' : String(v)),
  json: (v) => { try { return JSON.stringify(v, null, 2); } catch { return String(v); } },
  lines: (v) => (Array.isArray(v) ? v.map(String).join('\n') : v == null ? '' : String(v)),
  // Conversation transcript: [{ from, text }] → "from: text" blocks.
  chat: (v) => (Array.isArray(v)
    ? v.map((m) => `${m.from ?? m.sender ?? m.role ?? '?'}: ${m.text ?? m.content ?? ''}`).join('\n\n')
    : ''),
};

// Returns null when the source declares no glyphSource (→ "no 3D adapter"), or a
// payload whose text may be empty when the declared field has no content yet
// (→ "waiting for content").
function resolveGlyphPayload(win) {
  if (!win) return null;
  const spec = getWindowManifest(win.kind)?.glyphSource;
  if (!spec) return null;
  const fields = spec.fields || (spec.field ? [spec.field] : []);
  let raw = null;
  for (const f of fields) {
    const v = win[f];
    if (v != null && !(typeof v === 'string' && v === '')) { raw = v; break; }
  }
  const format = FORMATTERS[spec.format] || FORMATTERS.text;
  return { text: format(raw, win), filename: spec.filename || `${win.kind || 'window'}.txt` };
}

// Pull the payload of whichever window is wired into this one, straight from the
// reactive store. useShallow keeps us from re-rendering until text/filename
// actually change — so unrelated canvas activity (dragging windows, etc.) never
// churns the WebGPU renderer; only a real source mutation does.
function useWiredSource(winId) {
  return useWorkspaceStore(useShallow((s) => {
    const inbound = s.links.filter((l) => l.toId === winId);
    if (!inbound.length) return { text: '', filename: '', sourceId: null };
    // Most recently wired source wins (one display at a time, for now).
    const link = inbound[inbound.length - 1];
    const src = s.wins.find((w) => w.id === link.fromId) || null;
    const payload = resolveGlyphPayload(src);
    return {
      text: payload?.text ?? '',
      filename: payload?.filename ?? '',
      sourceId: src?.id ?? null,
      sourceTitle: src?.title || src?.kind || '',
      unsupported: Boolean(src) && payload == null,
    };
  }));
}

// Keep the WebGPU drawing buffer + camera aspect locked to the window's content
// box. GlyphCanvas pins the canvas to a fixed pixel size at construction and r3f
// doesn't grow it when this floating window is resized, so without this the 3D
// view stays a fixed rectangle in the corner. offsetWidth/offsetHeight are layout
// px (immune to the canvas's `transform: scale(zoom)` ancestor), so it stays
// correct at any canvas zoom too.
function ResizeSync() {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  React.useEffect(() => {
    const host = gl.domElement?.parentElement;
    if (!host) return;
    const apply = () => {
      const w = host.offsetWidth, h = host.offsetHeight;
      if (w <= 0 || h <= 0) return;
      gl.setSize(w, h);
      if (camera.isPerspectiveCamera) { camera.aspect = w / h; camera.updateProjectionMatrix(); }
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(host);
    // GlyphCanvas bakes three's WebGPU depth/MSAA render targets at the canvas's
    // construction size; they only rebuild on a GENUINE resize, not a bare
    // gl.setSize. If the content box settled after construction, the render stays
    // boxed at that initial size (the top-left rectangle). So once mounted, fire a
    // few real resize events — r3f re-measures (offsetSize, transform-immune) and
    // three rebuilds its targets at the true content-box size.
    const kicks = [60, 250, 500].map((ms) => setTimeout(() => {
      apply();
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('resize'));
    }, ms));
    return () => { ro.disconnect(); kicks.forEach(clearTimeout); };
  }, [gl, camera]);
  return null;
}

// A censai-owned grid that drives the core CodeGrid via the ASYNC worker path
// (`loadFileAsync`) so a slow or large build can never hard-lock the main thread,
// and with glyph3d's own line-wrap + pagination turned OFF (wrapWidth/pageHeight
// 0). The infinite canvas already provides pan/zoom/orbit, so the 3D body must
// never re-wrap its own content — one source line stays one row. The published
// @glyph3d/r3f <CodeGrid> only exposes the sync path + default wrapWidth:200, so
// we drive the core directly here (using the binding's exported context hooks).
// Candidate to upstream as <CodeGrid async noWrap>.
const NO_WRAP_LAYOUT = { wrapWidth: 0, pageHeight: 0 };
const ORIGIN = [0, 0, 0];

function AsyncCodeGrid({ text = '', filename = '', worldScale = 0.025, textColor }) {
  const scene = useThree((s) => s.scene);
  const atlas = useGlyphAtlas();
  const { addGrid, removeGrid } = useGridRegistry();
  const gridRef = React.useRef(null);

  // Mount once: build the core grid (no-wrap layout), attach, register. Teardown
  // disposes. Construction-time options are intentionally NOT reactive.
  React.useEffect(() => {
    const grid = new CodeGridCore(scene, atlas, {
      name: filename || 'code3d',
      worldScale,
      showBackground: false,
      layout: NO_WRAP_LAYOUT,
      ...(textColor ? { textColor } : {}),
    });
    scene.add(grid);                                   // required by the core contract
    grid.position.set(...ORIGIN);
    addGrid(grid, { id: filename || 'code3d', type: 'grid' });
    gridRef.current = grid;
    return () => {
      removeGrid(grid);
      scene.remove(grid);
      grid.dispose?.();
      gridRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, atlas, addGrid, removeGrid]);

  // Reactive content load on the worker path — cannot freeze the UI thread.
  React.useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    let cancelled = false;
    Promise.resolve(grid.loadFileAsync(filename, text)).catch((e) => {
      if (!cancelled) console.error('[code3d] glyph load failed:', e);
    });
    return () => { cancelled = true; };
  }, [text, filename]);

  return null;
}

// ── the 3D scene (mounted once, in one pass — never driven from the render loop) ─
function GlyphScene({ atlas, text, filename, camRef }) {
  return (
    <GlyphCanvas
      atlas={atlas}
      // Measure the container via offsetWidth/offsetHeight (layout px), not
      // getBoundingClientRect — so sizing is immune to the infinite canvas's
      // `transform: scale(zoom)` ancestor and the buffer matches the window 1:1.
      resize={{ offsetSize: true }}
      camera={{ position: [0, 0, 600], fov: 55, near: 1, far: 20000 }}
      onCreated={({ scene }) => { scene.background = new THREE.Color(BG); }}
    >
      <ResizeSync />
      <ViewerCamera ref={camRef} />
      {text ? (
        <AsyncCodeGrid
          text={text}
          filename={filename}
          worldScale={WORLD_SCALE}
          textColor={TEXT_COLOR}
        />
      ) : null}
    </GlyphCanvas>
  );
}

function NoGpu() {
  return (
    <div style={{ padding: 18, color: 'var(--ink-soft)', fontSize: 12, fontFamily: 'var(--font-sans)', lineHeight: 1.5 }}>
      This browser doesn’t support <strong>WebGPU</strong> yet, which the 3D view needs.
      Try a recent Chrome, Edge, or Vivaldi.{' '}
      <a href="https://github.com/tikimcfee/glyph3d-js" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-ink)' }}>About glyph3d →</a>
    </div>
  );
}

function Hint({ children }) {
  return (
    <div style={{ flex: 1, display: 'grid', placeItems: 'center', textAlign: 'center', padding: 24, color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.06em', lineHeight: 1.7 }}>
      {children}
    </div>
  );
}

export function Code3dWindow({ win, onUpdate }) {
  const gpu = typeof navigator !== 'undefined' && !!navigator.gpu;
  const { atlas, error: engineError } = useGlyphEngine(gpu ? { fontUrl } : { fontUrl: null });
  const { text, filename, sourceId, sourceTitle, unsupported } = useWiredSource(win.id);
  const camRef = React.useRef(null);

  // Auto-frame the content when it (re)arrives. focusOnGrids() only moves the
  // camera — no remount, no setState — so nudging it off a short timer is safe
  // and never drives scene loading from the render loop.
  React.useEffect(() => {
    if (!text) return;
    const fit = () => camRef.current?.focusOnGrids?.();
    const ids = [120, 350, 700].map((ms) => setTimeout(fit, ms));
    return () => ids.forEach(clearTimeout);
  }, [text, sourceId]);

  const title = (
    <WindowTitle
      accent="var(--accent)"
      icon={<Icon.Code size={14} />}
      label="Code in 3D"
      subtitle={sourceId ? (sourceTitle || filename) : 'wire a window in'}
      attachedAgentIds={win.attachedAgents}
      onDetach={(id) => onUpdate?.({ attachedAgents: (win.attachedAgents || []).filter((a) => a !== id) })}
    >
      {sourceId && gpu && text ? (
        <button
          title="Fit to view"
          onClick={() => camRef.current?.focusOnGrids?.()}
          style={{ all: 'unset', cursor: 'pointer', display: 'grid', placeItems: 'center', width: 22, height: 22, borderRadius: 6, color: 'var(--ink-soft)', background: 'var(--surface-2)' }}
        >
          <Icon.Fullscreen size={13} />
        </button>
      ) : null}
    </WindowTitle>
  );

  let stage;
  if (!gpu) {
    stage = <NoGpu />;
  } else if (engineError) {
    stage = <div style={{ padding: 18, color: 'var(--ps-red)', fontFamily: 'var(--font-sans)', fontSize: 12 }}>Glyph engine failed: {engineError.message}</div>;
  } else if (!atlas) {
    stage = <Hint>booting glyph engine…</Hint>;
  } else if (!sourceId) {
    stage = <Hint>drag a wire from any window<br />into this one to render<br />its contents in 3D</Hint>;
  } else if (unsupported) {
    stage = <Hint>“{sourceTitle}” has no 3D adapter yet.<br />wire in an HTML Preview or Document.</Hint>;
  } else if (!text) {
    stage = <Hint>waiting for content from<br />“{sourceTitle}”…</Hint>;
  } else {
    stage = (
      <div style={{ flex: 1, minHeight: 0, position: 'relative', background: '#0e0c08' }}>
        <GlyphScene atlas={atlas} text={text} filename={filename} camRef={camRef} />
        <div style={{ position: 'absolute', bottom: 6, right: 8, pointerEvents: 'none', fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(255,255,255,0.32)', letterSpacing: '0.06em' }}>
          drag-orbit · scroll-zoom · glyph3d
        </div>
      </div>
    );
  }

  return (
    <>
      {title}
      <div style={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {stage}
      </div>
    </>
  );
}

export default Code3dWindow;
