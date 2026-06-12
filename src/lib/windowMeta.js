// AI-FIRST WINDOW METADATA — single concept per file.
//
// A "window" declares everything about itself in ONE co-located `windowMeta`
// object. These pure helpers derive the two central records the app needs
// (a manifest entry + a registry entry) from that single declaration, so a new
// window never requires hand-editing the central registries.
//
// Contract (authored in each window's meta.js):
//   export const windowMeta = {
//     kind: 'helloFactory',            // REQUIRED. stable id, camelCase.
//     label: 'Hello Factory',          // REQUIRED. human/menu label.
//     defaultSize: { w: 420, h: 320 }, // REQUIRED. opening size.
//     // --- everything below is optional; sensible defaults are derived ---
//     componentName: 'HelloFactoryWindow', // default: <Kind>Window
//     canvasType: 'helloFactory',          // default: kind
//     title: 'Hello Factory',              // default: label
//     canPin: true,
//     canSpawnFromRegion: true,
//     persistence: 'workspace',            // 'workspace' | 'local_only'
//     entitlement: 'windows.helloFactory', // default: windows.<kind>
//     modeAvailability: { local_desktop, private_server, cloud_saas },
//     lab: { title, props },               // optional window-lab fixture
//     launcher: { show, order, icon, label, hint }, // optional empty-canvas tile
//     glyphSource: { fields, format, filename }, // optional: makes this window
//                                            // renderable by the Code-in-3D sink.
//                                            // `fields` = ordered win.* keys (first
//                                            // non-empty wins); `format` keys the
//                                            // sink's formatter (text|json|lines|chat).
//   };

export const FALLBACK_WINDOW_SIZE = Object.freeze({ w: 360, h: 320 });

export const DEFAULT_MODE_AVAILABILITY = Object.freeze({
  local_desktop: true,
  private_server: true,
  cloud_saas: true,
});

/** Derive `XxxWindow` from a kind id like `xxx` or `xxx_yyy`. */
export function toComponentName(kind) {
  const normalized = String(kind || '')
    .replace(/[_-]+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (_, c) => c.toUpperCase());
  if (!normalized) return 'UnknownWindow';
  return normalized.endsWith('Window') ? normalized : `${normalized}Window`;
}

/** Validate + fill defaults. Throws on missing required fields so bad windows fail loud at build/sync time. */
export function normalizeWindowMeta(meta = {}) {
  const kind = String(meta.kind || '').trim();
  if (!kind) throw new Error('windowMeta.kind is required');
  if (!meta.label) throw new Error(`windowMeta.label is required (kind="${kind}")`);
  const size = meta.defaultSize && Number.isFinite(meta.defaultSize.w) && Number.isFinite(meta.defaultSize.h)
    ? { w: meta.defaultSize.w, h: meta.defaultSize.h }
    : { ...FALLBACK_WINDOW_SIZE };
  return Object.freeze({
    kind,
    canvasType: meta.canvasType || kind,
    label: meta.label,
    componentName: meta.componentName || toComponentName(kind),
    componentPath: meta.componentPath || null,
    defaultSize: Object.freeze(size),
    title: meta.title || meta.label,
    canPin: meta.canPin !== false,
    canSpawnFromRegion: meta.canSpawnFromRegion !== false,
    persistence: meta.persistence || 'workspace',
    entitlement: meta.entitlement || `windows.${kind}`,
    modeAvailability: Object.freeze({ ...DEFAULT_MODE_AVAILABILITY, ...(meta.modeAvailability || {}) }),
    lab: meta.lab ? Object.freeze({ ...meta.lab }) : null,
    launcher: meta.launcher ? Object.freeze({ ...meta.launcher }) : null,
    glyphSource: meta.glyphSource ? Object.freeze({ ...meta.glyphSource }) : null,
  });
}

/** Shape consumed by src/lib/windowManifest.js (WINDOW_MANIFESTS array). */
export function deriveManifestEntry(meta) {
  const m = normalizeWindowMeta(meta);
  const entry = {
    kind: m.kind,
    canvasType: m.canvasType,
    label: m.label,
    componentName: m.componentName,
    componentPath: m.componentPath || `src/components/${m.componentName}.jsx`,
    defaultSize: { ...m.defaultSize },
  };
  if (m.lab) entry.lab = { ...m.lab };
  if (m.launcher) entry.launcher = { ...m.launcher };
  if (m.glyphSource) entry.glyphSource = { ...m.glyphSource };
  return entry;
}

/** Shape consumed by src/lib/windowRegistry.js (WINDOW_REGISTRY map value). */
export function deriveRegistryEntry(meta) {
  const m = normalizeWindowMeta(meta);
  return {
    componentKey: m.componentName,
    defaultSize: { ...m.defaultSize },
    title: m.title,
    canPin: m.canPin,
    canSpawnFromRegion: m.canSpawnFromRegion,
    persistence: m.persistence,
    entitlement: m.entitlement,
    modeAvailability: { ...m.modeAvailability },
  };
}

/**
 * Merge discovered window metas onto a static seed (existing hand-authored
 * windows). Seed entries always win, so adopting this system never disturbs an
 * existing window — discovered metas only ADD new kinds. Returns the list of
 * metas whose kind is not already present in `seedKinds`.
 */
export function selectNewMetas(metas, seedKinds) {
  const seen = new Set(seedKinds);
  const out = [];
  for (const meta of metas) {
    const m = normalizeWindowMeta(meta);
    if (seen.has(m.kind)) continue;
    seen.add(m.kind);
    out.push(m);
  }
  return out;
}
