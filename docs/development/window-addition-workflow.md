# Window Addition Workflow

Use this workflow before adding or changing any CensaiHub window. The source of truth is the manifest; every other touchpoint either renders the window, exposes it in the UI, or verifies that the wiring did not drift.

## 1. Define The Window Contract

Decide these values before writing the component:

- `kind`: persistent legacy window kind, camelCase, starts lowercase.
- `canvasType`: usually the same as `kind`; only differ when preserving a legacy alias.
- `label`: human-readable window picker label.
- `componentName`: exported React component name.
- `componentPath`: `src/components/<ComponentName>.jsx`.
- `defaultSize`: minimum useful size for the real workflow.
- `lab`: optional title/props for isolated validation.

Use the cookie-cutter command for ordinary windows:

```powershell
npm run window:new -- --name "<Window Name>" --button "<Button Label>" --text "<Body text>"
```

Example:

```powershell
npm run window:new -- --name "Repo Tools" --button "Run check" --text "Small focused repo tool."
```

Use the lower-level scaffold command only when you need explicit component names or aliases:

```powershell
npm run window:scaffold -- <kind> --component <ComponentName> --label "<Label>" --width <w> --height <h>
```

## 2. Required Files

These are mandatory for every new window:

| File | Required change |
| --- | --- |
| `src/components/<ComponentName>.jsx` | Export the window component. Accept `win`; accept `onUpdate` if the title bar detaches agents or persists local window state. |
| `src/lib/windowManifest.js` | Add one `WINDOW_MANIFESTS` entry with `kind`, `canvasType`, `label`, `componentName`, `componentPath`, and `defaultSize`. |
| `src/components/Windows.jsx` | Import the component and add it to `WINDOW_COMPONENTS`. |

Do not hand-edit `src/lib/canvasObjectTypes.js` for normal windows. It derives aliases and object types from `windowManifest.js`.

Do not hand-edit `src/lib/canvasObjectRegistry.jsx` for normal windows. It receives `WINDOW_TYPES` from `Windows.jsx`.

## 3. Exposure Points

Pick the exposure points intentionally. A window can be valid without appearing everywhere, but user-facing windows should have at least one obvious launch path.

| Surface | File | When to update |
| --- | --- | --- |
| Empty workspace buttons | `src/components/Canvas.jsx` `EmptyState` | Core windows users should discover without drawing a region. |
| Region picker | `src/components/Canvas.jsx` `RegionMenu` | Windows that benefit from a user-sized placement area. |
| New window rotation | `src/app.jsx` `onNewWindow` order | Windows that should appear from the global new-window command. |
| Top app menu | `src/components/Chrome.jsx` | Windows that are operational tools or global app surfaces. |
| Dedicated dock/group affordance | `src/components/Dock.jsx` | Windows directly tied to agent or group workflows. |

When adding a launch path, pass the same useful default size as the manifest unless the surface has a better contextual size.

## 4. Component Rules

- Use `WindowTitle` from `src/components/Windows.jsx`.
- Use shared icons from `src/components/Icons.jsx`.
- Keep the root body as `flex: 1` with `minHeight: 0`; put scrolling on an inner container.
- Use existing API helpers from `src/lib/api.js` where they exist.
- Use direct `fetch` only when there is no helper yet.
- Poll live operational state from existing endpoints instead of duplicating backend state.
- Keep local state inside the component unless it must persist with the window record through `onUpdate`.
- Make empty, loading, degraded, and error states visible in the window itself.

## 5. Validation

Run these before calling the work done:

```powershell
npm run window:validate
npm run build
```

For visual or behavior changes, also open the app at:

```text
http://127.0.0.1:5173
```

Then verify:

- The window can be launched from every surface you changed.
- The title bar renders.
- The body is not blank.
- Scrolling works inside the window without moving the whole canvas.
- The window survives refresh if it is spawned and workspace persistence is enabled.
- The browser console has no import or render errors.

## 6. Failure Checklist

If the window shows as an unknown canvas object:

- Check `src/lib/windowManifest.js` for the `kind` and `canvasType`.
- Check `src/components/Windows.jsx` for both the import and `WINDOW_COMPONENTS` entry.
- Run `npm run window:validate`.

If the window launches but is blank:

- Check the component export name matches `componentName`.
- Check `WindowTitle` import cycles did not move.
- Check browser console errors.
- Run `npm run build` for Vite import analysis.

If the window exists but cannot be found by users:

- Add it to one of the exposure points in section 3.
- Prefer `EmptyState` for common windows and `RegionMenu` for placement-sensitive windows.

## 7. Done Definition

A window addition is complete only when:

- The component exists.
- The manifest entry exists.
- `Windows.jsx` imports and maps it.
- Intended launch surfaces exist.
- `npm run window:validate` passes.
- `npm run build` passes.
- A live browser check confirms it renders.
