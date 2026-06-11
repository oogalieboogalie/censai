# Censai Frontend Architecture Reference

This document describes the active entry points and window rendering flows in the Censai frontend application.

## Active Entry Point & Layout

1. **Active Frontend Entry**: [`src/app.jsx`](../src/app.jsx)
   - Imports [`src/app/AppContent.jsx`](../src/app/AppContent.jsx) which contains the main React workspace store integration, the toolbar, the dock, and the canvas.

2. **Active Canvas Layout**: [`src/components/Canvas.jsx`](../src/components/Canvas.jsx)
   - Renders the infinite grid, zoom controls, selection zones, and layers of windows.

## Window Spawning & Rendering Flow

When a window is spawned on the canvas, it traverses the following components:

```
App (src/app.jsx)
 └── AppContent (src/app/AppContent.jsx)
      └── Canvas (src/components/Canvas.jsx)
           └── CanvasFloatingWindows / CanvasMaximizedWindows / CanvasPinnedWindows (src/components/canvas/CanvasWindowLayers.jsx)
                └── WindowFrame (src/components/Windows.jsx)
                     └── WINDOW_TYPES (src/components/windows/windowRegistry.js)
                          └── Specific Window (e.g. DocWindow at src/components/DocWindow.jsx)
```

1. **`AppContent`** calls `spawnAt(kind, props, pos, size)` which sets up default window sizes via `src/lib/windowRegistry.js`.
2. **`Canvas`** delegates window rendering to **`CanvasFloatingWindows`**, **`CanvasMaximizedWindows`**, or **`CanvasPinnedWindows`**.
3. These window layers wrap each window in **`WindowFrame`** (defined in [`src/components/Windows.jsx`](../src/components/Windows.jsx)).
4. **`WindowFrame`** looks up the React component in **`WINDOW_TYPES`** (exported from [`src/components/windows/windowRegistry.js`](../src/components/windows/windowRegistry.js)).
5. The component is instantiated (e.g. **`DocWindow`** from [`src/components/DocWindow.jsx`](../src/components/DocWindow.jsx)).

---

## Stale / Legacy Code Paths (Quarantined)

> [!WARNING]
> Stale versions of the canvas and document windows previously existed at root paths. They have been moved to `docs/legacy/` to prevent agents from mistakenly editing inactive code:
> - `docs/legacy/canvas.jsx` (replaced by [`src/components/Canvas.jsx`](../src/components/Canvas.jsx))
> - `docs/legacy/doc-window.jsx` (replaced by [`src/components/DocWindow.jsx`](../src/components/DocWindow.jsx))
>
> **Do not edit files under `docs/legacy/`.** Always patch the active files in `src/components/`.
