# Window Integration Contract

The Window Integration Contract is the repo-native pattern for provider windows in CensaiHub. It lets a new provider join the canvas with:

1. one manifest entry in `src/lib/windowManifest.js`
2. one React component in `src/components/*Window.jsx`
3. optional validation/test coverage when the provider adds new contract vocabulary

No app-level branching should be required for a new provider window.

## Goals

- Keep the infinite canvas as the navigation model. Provider windows are still normal windows.
- Make provider identity, auth, risk, capabilities, and connection status declarative.
- Give agents and UI code one stable metadata shape to inspect.
- Keep existing windows working. The `integration` block is optional.
- Keep provider-specific behavior inside the provider window or provider service module, not in `AppContent.jsx`.

## Manifest Shape

Provider integrations extend an existing window manifest with an optional `integration` block:

```js
{
  kind: 'providerConnect',
  canvasType: 'providerConnect',
  label: 'Provider Connect',
  componentName: 'ProviderConnectWindow',
  componentPath: 'src/components/ProviderConnectWindow.jsx',
  defaultSize: { w: 460, h: 540 },
  integration: {
    provider: {
      id: 'demo-provider',
      name: 'Demo Provider',
      category: 'developer-tools',
      docsUrl: 'https://example.com/docs',
    },
    authMode: 'apiKey',
    capabilities: ['read', 'write', 'sync', 'agentTools'],
    embedMode: 'native',
    dangerLevel: 'low',
    defaultPermissions: ['read', 'write'],
    statusLabels: {
      disconnected: 'Not connected to Demo Provider',
      connecting: 'Authorizing...',
      connected: 'Connected to Demo Provider',
    },
  },
}
```

## Fields

`provider`
: Required for integration windows. Identifies the external service.

- `id`: required lowercase slug, globally unique across integration manifests.
- `name`: required human label.
- `category`: optional grouping hint. Unknown categories warn but do not fail validation.
- `docsUrl`: optional `http` or `https` documentation URL.

`authMode`
: Required. One of `none`, `apiKey`, `oauth2`, `oauthDevice`, `basic`, `session`, or `custom`.

`capabilities`
: Optional array of strings describing what the provider window can do. Known values live in `src/lib/windowIntegrationTypes.js`. Unknown capabilities warn instead of failing so a provider can ship before the shared vocabulary catches up.

`embedMode`
: Optional render/trust boundary. One of `native`, `iframe`, `proxy`, `apiOnly`, or `hybrid`. For how to choose (and how to embed apps that block iframing via `X-Frame-Options`/CSP), see [`IFRAME_EMBED_STRATEGIES.md`](IFRAME_EMBED_STRATEGIES.md).

`dangerLevel`
: Optional risk tier. One of `safe`, `low`, `elevated`, `high`, or `critical`.

`defaultPermissions`
: Optional coarse permission scopes requested by default. One of `read`, `write`, `delete`, `execute`, `admin`, `billing`, or `notify`.

`statusLabels`
: Optional connection state labels. Known states are `disconnected`, `connecting`, `connected`, `needsReauth`, and `error`.

## Source Of Truth

`src/lib/windowIntegrationTypes.js` owns:

- integration constants and enum values
- metadata normalization
- status label defaults
- SDK/Jest validation helpers
- small risk checks for dangerous permission combinations

Runtime code should call `getWindowIntegration(kindOrType)` from `src/lib/windowManifest.js` when it needs normalized metadata. Discovery code can enumerate `INTEGRATION_WINDOW_MANIFESTS` or use `WINDOW_MANIFEST_BY_PROVIDER`.

## Validation

`npm run window:validate` now validates any manifest that declares an `integration` field.

Validation fails for:

- missing or malformed `provider`
- invalid provider slug
- duplicate provider ids
- invalid `authMode`, `embedMode`, `dangerLevel`, or permission scopes
- invalid `docsUrl`
- malformed `capabilities` or `statusLabels`

Validation warns for:

- unknown provider categories
- unknown capabilities
- elevated permissions with `authMode: 'none'`
- destructive permissions with a low `dangerLevel`

## Security Rules

- Never persist raw secrets in workspace state. Provider windows may keep transient form state, but successful connection should exchange the secret and clear the input.
- Treat `embedMode` as a trust boundary. `iframe`, `proxy`, and `hybrid` windows need provider-specific hardening before they expose agent tools.
- Use `defaultPermissions` as the workspace-level contract only. Provider-specific OAuth scopes belong in the provider implementation.
- Agent-accessible provider actions should be advertised through `capabilities: ['agentTools']` and enforced by server-side permission checks before any side effect.
- `dangerLevel` should drive confirmation friction and UI emphasis. `high` and `critical` integrations should not silently execute destructive operations from an attached agent.

## Demo Window

`ProviderConnectWindow` proves the pattern. It renders provider name, status, auth affordance, capabilities, embed mode, danger level, and default permissions from manifest metadata. The demo simulates an API-key connection without storing the key.

The demo is deliberately generic. A real provider window can either:

- reuse the same component with different manifest metadata, or
- provide its own component while still exposing the same metadata to the canvas and agents.

## Single Source Of Truth — One Declaration

`src/lib/windowManifest.js` is the **single source of truth** for every window. A manifest entry is
the *only* hand-edit needed to add a window. Everything else is derived:

- **`WINDOW_REGISTRY`** (`src/lib/windowRegistry.js`) is generated from the manifest via
  `deriveRegistryEntry` (`src/lib/windowMeta.js`). Do **not** hand-author registry entries.
- **The React component** is auto-wired by `src/components/windows/windowRegistry.js` via
  `import.meta.glob` — name the file `src/components/<Name>Window.jsx` (or a folder window) and the
  manifest loop maps it. Do **not** hand-import components.
- **The launcher tile** on the empty canvas is rendered from `LAUNCHER_MANIFESTS` (the manifest's
  `launcher` blocks). Do **not** hardcode tiles in `CanvasEmptyState.jsx`.

`npm run window:validate` **fails** if any of these are hand-wired, so the contract can't drift.

### Optional manifest fields

```js
{
  kind: 'myWindow',
  type: 'window',          // 'window' (default) | 'integration' | 'agent' | 'package'
  label: 'My Window',
  componentName: 'MyWindow',
  componentPath: 'src/components/MyWindow.jsx',
  defaultSize: { w: 480, h: 360 },
  // runtime overrides — authored flat; defaults applied if omitted:
  persistence: 'workspace',          // 'workspace' (default) | 'local_only'
  entitlement: 'windows.myWindow',   // default: windows.<kind>
  modeAvailability: { cloud_saas: false }, // merged over { local_desktop, private_server, cloud_saas } = all true
  // launcher tile (omit to keep the window out of the empty-state launcher):
  launcher: { show: true, order: 140, icon: 'Tools', label: 'My Window', hint: 'what it does' },
  integration: { /* provider block — see above */ },
}
```

## Adding A Window Or Provider

1. Add **one** manifest entry to `src/lib/windowManifest.js` (or run `npm run window:new -- --name "My Window"`).
2. Create `src/components/<Name>Window.jsx` (scaffolded for you by `window:new`).
3. Add an `integration` block (and `type: 'integration'`) when the window connects to a provider.
4. Add a `launcher` block if it should appear on the empty canvas.
5. Run `npm run window:validate`.
6. Add or update tests only if the window introduces new shared vocabulary or validation behavior.

That is the whole list. There is no second registry to edit, no component import to add, and no
launcher button to hand-write.

## Architecture Review

This contract is intentionally small. The current fields cover discovery, auth shape, coarse permissions, risk, render mode, and connection wording without forcing every provider into the same implementation.

Useful omissions:

- Endpoint URLs, OAuth client ids, and token storage policy are not manifest fields yet. They are environment/runtime concerns and should stay out until there is a secure provider service layer.
- Provider-specific OAuth scopes are not in `defaultPermissions`. They are too detailed for canvas metadata and belong at the auth adapter boundary.
- Webhook routes, sync intervals, and background jobs are not part of the first contract. Add them only when multiple providers need the same scheduler surface.

Known risks:

- The manifest can describe intent, but server handlers still need to enforce permissions.
- `dangerLevel` is advisory until destructive actions consume it for confirmations and agent policy.
- `embedMode: 'iframe'` and `embedMode: 'hybrid'` need sandbox and origin rules before production use.

## Provider Service Registry (server side)

The server counterpart to this contract lives in `server/providers/registry.js`, exposed at
`/api/providers`. A window declares a provider in its `integration.provider.id`; the registry
**implements** that provider with an adapter:

- `authMode` — mirrors the manifest.
- `getCredential(ctx)` — resolves the credential. Defaults to env vars via `getSecret()` (the model
  every existing provider uses). **This is the seam** where per-user / per-tenant DB-backed token
  storage plugs in later (Phase 2 multi-tenancy).
- `test(ctx)` — a lightweight authenticated probe.

Endpoints (`server/routes/providers.js`) report **connection state only** — a secret never crosses
the HTTP boundary:

- `GET /api/providers` — all providers + cheap connection state.
- `GET /api/providers/:id/status` — one provider's state (no live probe).
- `POST /api/providers/:id/test` — runs the adapter's live probe.

`getUnimplementedProviderIds()` (covered by `tests/providerRegistry.test.js`) closes the loop: every
provider declared by a manifest must have a server adapter, so "register an integration" guarantees a
real, testable connection. `ProviderConnectWindow` reads its status from this registry.

### Adding a provider's server side

1. Add an adapter to `ADAPTERS` in `server/providers/registry.js` keyed by the manifest `provider.id`.
2. Point `getCredential` at the env var (or, later, the token store) and implement `test(ctx)`.
3. Add coverage in `tests/providerRegistry.test.js` if it introduces new behavior.

### Still deferred (needs the tenant model first)

Interactive key entry / OAuth flows and encrypted per-tenant token storage are intentionally not built
yet — they land on the `getCredential(ctx)` seam once Phase 2 multi-tenancy exists. Endpoint URLs and
OAuth client ids remain runtime/env concerns, not manifest fields.
