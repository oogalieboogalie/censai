import React from 'react';
import { useTheme, DEFAULT_THEME } from './Theme.jsx';
import { Icon } from './Icons.jsx';
import { WindowResizeHandles } from './windows/WindowResizeHandles.jsx';
import { useWindowWheelContainment } from './windows/useWindowWheelContainment.js';
import { useWindowFrameInteractions } from './windows/useWindowFrameInteractions.js';
import { getAccentBorder } from '../lib/canvasMath.js';

export { WindowTitle } from './windows/WindowTitle.jsx';
export { BrowserWindow, DocWindow, GenImageWindow, WINDOW_COMPONENTS, WINDOW_TYPES } from './windows/windowRegistry.js';

export const WindowFrame = React.memo(({ win, onUpdate, onClose, onSelect, onDragEnd, onWireStart, onWireDrag, onWireEnd, isActive, zoom = 1, pan = { x: 0, y: 0 }, allWins = [], children, style = {} }) => {
  const renderCount = React.useRef(0);
  renderCount.current++;

  const ref = React.useRef(null);
  const themeContext = useTheme();
  const theme = themeContext?.theme || DEFAULT_THEME;
  React.useEffect(() => {
    const el = ref.current; if (!el) return;
    const handleWheel = (e) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      onUpdate({ fontScale: Math.max(0.7, Math.min(2.0, (win.fontScale || 1.0) + (-e.deltaY > 0 ? 0.05 : -0.05))) });
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [win.id, win.fontScale, onUpdate]);

  const [hoverChrome, setHoverChrome] = React.useState(false);
  useWindowWheelContainment(ref);
  const { startDrag, startResize, startWire, onPointerMove, onPointerUp } = useWindowFrameInteractions({
    win, onUpdate, onSelect, onDragEnd, onWireStart, onWireDrag, onWireEnd, zoom, pan, theme, allWins, frameRef: ref
  });

  const accentBorder = getAccentBorder(win);
  const frameBorder = isActive || (win.attachedAgents || []).length > 0 || win.hue !== undefined ? accentBorder : 'var(--hairline)';
  const frameShadow = isActive
    ? `var(--window-shadow-active, 0 8px 30px oklch(0 0 0 / 0.15), 0 0 0 1px ${accentBorder})`
    : 'var(--window-shadow, var(--shadow-card))';

  // Pin/maximize/unpin only change STYLE on the same mounted frame — the
  // window must never re-parent to a different subtree or its state resets
  // (issue #118). Floating windows counter-apply pan/zoom themselves.
  let frameStyle = {};
  if (win.maximized) {
    frameStyle = { position: 'fixed', left: 80, top: 72, right: 24, bottom: 24, width: 'auto', height: 'auto', zIndex: 100, borderRadius: 'var(--radius-card)' };
  } else if (win.pinned) {
    frameStyle = { position: 'absolute', width: win.w * 0.75, height: win.h * 0.75, zIndex: isActive ? 20 : 10 };
  } else {
    frameStyle = {
      position: 'absolute', left: 0, top: 0, width: win.w, height: win.h,
      transform: `translate(${pan.x + win.x * zoom}px, ${pan.y + win.y * zoom}px) scale(${zoom})`,
      transformOrigin: '0 0', zIndex: isActive ? 20 : 10,
    };
  }

  return (
    <div ref={ref} data-win-id={win.id} data-render-count={renderCount.current} onPointerDown={onSelect}
      onMouseEnter={() => setHoverChrome(true)} onMouseLeave={() => setHoverChrome(false)}
      style={{
        ...frameStyle, ...style,
        background: 'var(--window-bg, var(--surface))',
        borderRadius: 'var(--window-radius, var(--radius-card))',
        border: `${theme.borderWidth || 1}px solid ` + frameBorder,
        boxShadow: frameShadow,
        backdropFilter: 'var(--window-backdrop, none)',
        WebkitBackdropFilter: 'var(--window-backdrop, none)',
        transition: 'box-shadow 0.2s, border-color 0.2s, background 0.2s, backdrop-filter 0.2s',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
      <span aria-hidden="true" style={{ position: 'absolute', left: 0, top: 0, right: 0, height: 'var(--window-strip-height, 0px)', background: 'var(--window-strip-bg, transparent)', zIndex: 3, pointerEvents: 'none' }} />
      <div onPointerDown={startDrag} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
        onDoubleClick={() => onUpdate({ maximized: !win.maximized })}
        onContextMenu={(e) => { e.preventDefault(); onUpdate({ hue: Math.floor(Math.random() * 360) }); }}
        title="Drag to move · double-click for fullscreen · right-click for color · Ctrl+scroll to scale text"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 30, cursor: win.pinned ? 'default' : 'grab', zIndex: 2 }} />
      {win.closable !== false && (
        <button onClick={(e) => { e.stopPropagation(); onClose(); }} title="Close window"
          style={{
            all: 'unset', cursor: 'pointer', position: 'absolute', top: 8, left: 8, zIndex: 5,
            width: 14, height: 14, borderRadius: '50%', background: 'var(--ps-red)',
            opacity: hoverChrome ? 1 : 'var(--window-control-idle-opacity, 0.35)',
            transition: 'opacity 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'oklch(0.25 0.1 25)'
          }}
        >
          <Icon.Close size={8} stroke={2.5}/>
        </button>
      )}
      <span aria-hidden="true" style={{ position: 'absolute', top: 8, left: 28, zIndex: 5, width: 14, height: 14, borderRadius: '50%', background: 'oklch(0.78 0.15 82)', display: 'var(--window-extra-controls-display, none)', boxShadow: 'inset 0 0 0 1px oklch(0 0 0 / 0.12)', pointerEvents: 'none' }} />
      <span aria-hidden="true" style={{ position: 'absolute', top: 8, left: 48, zIndex: 5, width: 14, height: 14, borderRadius: '50%', background: 'oklch(0.70 0.15 145)', display: 'var(--window-extra-controls-display, none)', boxShadow: 'inset 0 0 0 1px oklch(0 0 0 / 0.12)', pointerEvents: 'none' }} />
      <button
        onClick={(e) => { e.stopPropagation(); onUpdate({ maximized: !win.maximized }); }}
        title={win.maximized ? 'Restore window size' : 'Maximize window'}
        style={{
          all: 'unset', cursor: 'pointer', position: 'absolute', top: 5, right: 32, zIndex: 5,
          width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: win.maximized ? 'var(--accent)' : 'var(--ink-faint)',
          background: win.maximized ? 'var(--accent-soft)' : 'transparent',
          opacity: hoverChrome || win.maximized ? 1 : 0,
          transition: 'opacity 0.2s, color 0.15s, background 0.15s',
        }}
      >
        {win.maximized ? <Icon.Restore size={12} /> : <Icon.Maximize size={12} />}
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onUpdate({ pinned: !win.pinned }); }}
        title={win.pinned ? 'Unpin from screen' : 'Pin to screen'}
        style={{
          all: 'unset', cursor: 'pointer', position: 'absolute', top: 5, right: 8, zIndex: 5,
          width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: win.pinned ? 'var(--accent)' : 'var(--ink-faint)',
          background: win.pinned ? 'var(--accent-soft)' : 'transparent',
          opacity: hoverChrome || win.pinned ? 1 : 0,
          transition: 'opacity 0.2s, color 0.15s, background 0.15s',
          transform: win.pinned ? 'rotate(0deg)' : 'rotate(45deg)',
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill={win.pinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
          <path d="M12 17v5"/><path d="M9 2h6l-1 7h4l-7 8-2-8H5l4-7z" fill={win.pinned ? 'currentColor' : 'none'}/>
        </svg>
      </button>
      {isActive && !win.pinned && (
        <div onPointerDown={startWire} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
          style={{
            position: 'absolute', right: -6, top: '50%', marginTop: -6, width: 12, height: 12, borderRadius: '50%',
            background: accentBorder, border: '2px solid var(--surface)', cursor: 'crosshair', zIndex: 10,
            boxShadow: `0 0 8px ${accentBorder.replace(')', ' / 0.5)')}`
          }}
        />
      )}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: win.pinned ? 'hidden' : 'visible', zoom: win.fontScale || 1.0 }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          flexGrow: win.pinned ? 0 : 1,
          flexShrink: 0,
          flexBasis: win.pinned ? 'auto' : '0%',
          minHeight: 0,
          width: win.pinned ? win.w : 'auto',
          height: win.pinned ? win.h : 'auto',
          transform: win.pinned ? 'scale(0.75)' : 'none',
          transformOrigin: 'top left',
        }}>
          {children}
        </div>
      </div>
      {!win.pinned && <WindowResizeHandles zoom={zoom} startResize={startResize} onPointerMove={onPointerMove} onPointerUp={onPointerUp} />}
    </div>
  );
});
