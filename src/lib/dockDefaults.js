/**
 * src/lib/dockDefaults.js
 *
 * Brief B3 — extracted from Dock.jsx so DEFAULT_GROUPS can be imported
 * by src/lib/store.js without creating an import cycle:
 *
 *   store.js  ->  Dock.jsx  ->  useDockVisibility.js  ->  store.js
 *
 * Was previously: `import { DEFAULT_GROUPS } from '../components/Dock.jsx';`
 * inside store.js, which worked because Dock.jsx didn't import store.js.
 * B3 added the useDockVisibility hook under src/components/dock/, which
 * imports from store.js, closing the cycle. Extracting DEFAULT_GROUPS to
 * a leaf module breaks the cycle cleanly.
 */

export const DEFAULT_GROUPS = [
  { id: 'core', name: 'Core Team', hue: 5, agentIds: ['architect','censai','atlas','genesis','nexus','foundation','echo'], collapsed: false },
];