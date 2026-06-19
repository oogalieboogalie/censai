import React from 'react';
import '@excalidraw/excalidraw/index.css';
import { WindowTitle } from './windows/WindowTitle.jsx';
import { Icon } from './Icons.jsx';
import {
  buildExcalidrawScene,
  createEmptyExcalidrawScene,
  persistExcalidrawScene,
  readExcalidrawScene,
} from './excalidraw/state.js';

export function ExcalidrawWindow({ win, onUpdate }) {
  const [Editor, setEditor] = React.useState(null);
  const [loadError, setLoadError] = React.useState('');
  const [scene, setScene] = React.useState(() => readExcalidrawScene(win));
  const apiRef = React.useRef(null);
  const saveTimerRef = React.useRef(null);
  const supportsNativeCanvas =
    typeof window !== 'undefined'
    && typeof window.Path2D === 'function'
    && typeof window.FontFace === 'function';

  React.useEffect(() => {
    if (!supportsNativeCanvas) return undefined;
    let active = true;
    import('@excalidraw/excalidraw')
      .then((mod) => {
        if (active) setEditor(() => mod.Excalidraw);
      })
      .catch((err) => {
        if (active) setLoadError(err.message || 'Failed to load Excalidraw');
      });
    return () => {
      active = false;
    };
  }, [supportsNativeCanvas]);

  React.useEffect(() => {
    setScene(readExcalidrawScene(win));
  }, [win.id, win.state?.excalidraw, win.title]);

  React.useEffect(() => () => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
  }, []);

  const queueSceneSave = React.useCallback((nextScene) => {
    setScene(nextScene);
    persistExcalidrawScene(win.id, nextScene);
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      onUpdate?.({
        state: {
          ...(win.state || {}),
          excalidraw: nextScene,
        },
      });
    }, 180);
  }, [onUpdate, win.id, win.state]);

  const handleChange = React.useCallback((elements, appState, files) => {
    queueSceneSave(buildExcalidrawScene(elements, appState, files, win.title));
  }, [queueSceneSave, win.title]);

  const handleReset = React.useCallback(() => {
    const nextScene = createEmptyExcalidrawScene(win.title || 'Excalidraw sketch');
    queueSceneSave(nextScene);
    apiRef.current?.updateScene?.(nextScene);
  }, [queueSceneSave, win.title]);

  const objectCount = scene.elements.length;
  const subtitle = objectCount > 0 ? `${objectCount} object${objectCount === 1 ? '' : 's'}` : 'Blank canvas';

  return (
    <>
      <WindowTitle icon={<Icon.Edit size={14} />} label="Excalidraw" subtitle={subtitle}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleReset();
          }}
          style={{
            all: 'unset',
            cursor: 'pointer',
            padding: '2px 6px',
            borderRadius: 4,
            fontSize: 10,
            background: 'var(--surface-2)',
            color: 'var(--ink-faint)',
            border: '1px solid var(--hairline)',
          }}
          title="Clear the saved scene"
        >
          Reset
        </button>
      </WindowTitle>

      <div style={{ flex: 1, minHeight: 0, position: 'relative', background: 'var(--surface)' }}>
        {loadError ? (
          <div style={{ height: '100%', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center', color: 'var(--ink-soft)' }}>
            <div style={{ display: 'grid', gap: 8 }}>
              <strong style={{ color: 'var(--ink)' }}>Excalidraw failed to load</strong>
              <span>{loadError}</span>
            </div>
          </div>
        ) : !supportsNativeCanvas ? (
          <div style={{ height: '100%', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center', color: 'var(--ink-soft)' }}>
            <div style={{ display: 'grid', gap: 8 }}>
              <strong style={{ color: 'var(--ink)' }}>Excalidraw needs a full browser canvas</strong>
              <span>This environment is missing drawing APIs, so the sketch surface stays disabled here.</span>
            </div>
          </div>
        ) : !Editor ? (
          <div style={{ height: '100%', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center', color: 'var(--ink-soft)' }}>
            <div style={{ display: 'grid', gap: 8 }}>
              <strong style={{ color: 'var(--ink)' }}>Loading Excalidraw</strong>
              <span>Preparing the sketch surface for this window.</span>
            </div>
          </div>
        ) : (
          <>
            {objectCount === 0 && (
              <div style={{
                position: 'absolute',
                top: 12,
                right: 12,
                zIndex: 2,
                pointerEvents: 'none',
                padding: '6px 10px',
                borderRadius: 999,
                background: 'color-mix(in oklab, var(--surface-2) 88%, transparent)',
                border: '1px solid var(--hairline)',
                color: 'var(--ink-soft)',
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
              }}>
                Blank canvas. Start sketching.
              </div>
            )}
            <Editor
              initialData={scene}
              onChange={handleChange}
              excalidrawAPI={(api) => {
                apiRef.current = api;
              }}
            />
          </>
        )}
      </div>
    </>
  );
}
