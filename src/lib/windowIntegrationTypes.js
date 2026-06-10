/**
 * Window Integration Contract - typed/structured metadata
 *
 * A "provider window" is a window that connects CensaiHub to an external
 * service (GitHub, Slack, a mail host, an LLM gateway, etc.). Historically each
 * such window would be wired up with one-off branching in the app. This module
 * defines a single declarative contract so that adding a provider window is
 * *manifest metadata + a component* - never new app-level branching.
 *
 * This file is the single source of truth for the enums and the validation
 * logic. Both the runtime UI (`src/components`) and the build-time SDK
 * (`scripts/window-sdk.mjs`) import from here so the rules never drift.
 *
 * It is intentionally framework-free (no React, no Vite, no Node-only APIs)
 * so it can be imported from the browser bundle, a Node script, and Jest alike.
 */

export const WINDOW_INTEGRATION_VERSION = 1;

/**
 * How the window authenticates against its provider. The UI uses this to pick
 * which connect affordance to render (key field, OAuth popup, device code, etc.).
 */
export const AUTH_MODES = Object.freeze({
  NONE: 'none', // no auth: public/read-only or local-only surface
  API_KEY: 'apiKey', // user pastes a token/key
  OAUTH2: 'oauth2', // redirect / popup authorization-code flow
  OAUTH_DEVICE: 'oauthDevice', // device-code flow (show code, poll)
  BASIC: 'basic', // username + password / host + credentials
  SESSION: 'session', // relies on an existing server-side session/cookie
  CUSTOM: 'custom', // provider-specific handshake the window renders itself
});
export const AUTH_MODE_VALUES = Object.freeze(Object.values(AUTH_MODES));

/**
 * How provider content is surfaced inside the window. This is a trust boundary
 * as much as a rendering hint; see docs/WINDOW_INTEGRATION_SPEC.md.
 */
export const EMBED_MODES = Object.freeze({
  NATIVE: 'native', // in-app React UI calling provider APIs (most trusted)
  IFRAME: 'iframe', // provider page in a sandboxed iframe
  PROXY: 'proxy', // content fetched/rendered through our backend proxy
  API_ONLY: 'apiOnly', // no provider visual surface; data only
  HYBRID: 'hybrid', // native chrome wrapping an embedded provider surface
});
export const EMBED_MODE_VALUES = Object.freeze(Object.values(EMBED_MODES));

/**
 * Ordered risk tier of the actions this integration can perform once connected.
 * Drives confirmation friction and how prominently the danger is surfaced.
 */
export const DANGER_LEVELS = Object.freeze({
  SAFE: 'safe', // read-only, no side effects
  LOW: 'low', // writes scoped to user's own data
  ELEVATED: 'elevated', // writes that affect others / shared state
  HIGH: 'high', // destructive or irreversible actions
  CRITICAL: 'critical', // billing, account, or infra-level control
});
export const DANGER_LEVEL_VALUES = Object.freeze([
  DANGER_LEVELS.SAFE,
  DANGER_LEVELS.LOW,
  DANGER_LEVELS.ELEVATED,
  DANGER_LEVELS.HIGH,
  DANGER_LEVELS.CRITICAL,
]);
export const DANGER_LEVEL_RANK = Object.freeze(
  DANGER_LEVEL_VALUES.reduce((acc, level, index) => {
    acc[level] = index;
    return acc;
  }, {})
);

/**
 * Permission scopes a window may request by default. These gate both what the
 * UI exposes and what attached agents are allowed to drive through the window.
 * Kept deliberately coarse; provider-specific scopes belong in the provider's
 * own OAuth config, not the workspace contract.
 */
export const PERMISSION_SCOPES = Object.freeze({
  READ: 'read',
  WRITE: 'write',
  DELETE: 'delete',
  EXECUTE: 'execute', // trigger jobs / actions on the provider
  ADMIN: 'admin', // manage provider-side settings/users
  BILLING: 'billing', // anything touching money
  NOTIFY: 'notify', // send messages/notifications outward
});
export const PERMISSION_SCOPE_VALUES = Object.freeze(Object.values(PERMISSION_SCOPES));

/** Permission scopes considered elevated for security cross-checks. */
const ELEVATED_PERMISSIONS = Object.freeze([
  PERMISSION_SCOPES.WRITE,
  PERMISSION_SCOPES.DELETE,
  PERMISSION_SCOPES.EXECUTE,
  PERMISSION_SCOPES.ADMIN,
  PERMISSION_SCOPES.BILLING,
]);
const DESTRUCTIVE_PERMISSIONS = Object.freeze([
  PERMISSION_SCOPES.DELETE,
  PERMISSION_SCOPES.ADMIN,
  PERMISSION_SCOPES.BILLING,
]);

/**
 * The connection lifecycle every provider window shares. `statusLabels` lets a
 * provider override the human wording for any of these states.
 */
export const CONNECTION_STATES = Object.freeze({
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  NEEDS_REAUTH: 'needsReauth',
  ERROR: 'error',
});
export const CONNECTION_STATE_VALUES = Object.freeze(Object.values(CONNECTION_STATES));

export const DEFAULT_STATUS_LABELS = Object.freeze({
  [CONNECTION_STATES.DISCONNECTED]: 'Not connected',
  [CONNECTION_STATES.CONNECTING]: 'Connecting...',
  [CONNECTION_STATES.CONNECTED]: 'Connected',
  [CONNECTION_STATES.NEEDS_REAUTH]: 'Re-authentication required',
  [CONNECTION_STATES.ERROR]: 'Connection error',
});

/** Optional, non-enforced vocabulary for `provider.category`. */
export const PROVIDER_CATEGORIES = Object.freeze([
  'developer-tools',
  'communication',
  'productivity',
  'storage',
  'ai-model',
  'analytics',
  'commerce',
  'infrastructure',
  'social',
  'other',
]);

/**
 * Recommended capability vocabulary. Capabilities are free-form (providers
 * differ wildly), but staying within this set keeps UI affordances and agent
 * tool exposure consistent. Unknown capabilities produce a warning, not an error.
 */
export const KNOWN_CAPABILITIES = Object.freeze([
  'read',
  'write',
  'search',
  'sync',
  'webhook',
  'realtime',
  'fileUpload',
  'fileDownload',
  'notify',
  'agentTools', // exposes provider actions as tools attachable agents can call
  'embedView',
  'billing',
]);

export const DEFAULT_INTEGRATION = Object.freeze({
  authMode: AUTH_MODES.NONE,
  embedMode: EMBED_MODES.NATIVE,
  dangerLevel: DANGER_LEVELS.LOW,
  capabilities: Object.freeze([]),
  defaultPermissions: Object.freeze([]),
  statusLabels: Object.freeze({}),
});

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isSlug(value) {
  return typeof value === 'string' && /^[a-z][a-z0-9-]*$/.test(value);
}

function isHttpUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/** True if a manifest declares integration metadata. */
export function isIntegrationManifest(manifest) {
  return isPlainObject(manifest) && isPlainObject(manifest.integration);
}

/**
 * Validate a single integration metadata object.
 *
 * Returns `{ errors, warnings }`. `errors` are contract violations that must
 * fail validation; `warnings` are advisory (unknown vocabulary, risk smells)
 * that should be surfaced but not block.
 *
 * @param {object} integration
 * @param {{ label?: string }} [opts] label is used to prefix messages (e.g. the window kind)
 */
export function validateIntegrationMetadata(integration, opts = {}) {
  const label = opts.label || 'integration';
  const errors = [];
  const warnings = [];

  if (!isPlainObject(integration)) {
    errors.push(`${label}: integration must be an object`);
    return { errors, warnings };
  }

  // provider: required, identifies the external service
  const provider = integration.provider;
  if (!isPlainObject(provider)) {
    errors.push(`${label}: integration.provider must be an object with an id and name`);
  } else {
    if (!isSlug(provider.id)) {
      errors.push(`${label}: provider.id must be a lowercase slug (got ${JSON.stringify(provider.id)})`);
    }
    if (typeof provider.name !== 'string' || !provider.name.trim()) {
      errors.push(`${label}: provider.name is required`);
    }
    if (provider.docsUrl !== undefined && !isHttpUrl(provider.docsUrl)) {
      errors.push(`${label}: provider.docsUrl must be an http(s) URL`);
    }
    if (provider.category !== undefined && !PROVIDER_CATEGORIES.includes(provider.category)) {
      warnings.push(`${label}: provider.category "${provider.category}" is not a known category`);
    }
  }

  // authMode: required
  if (!AUTH_MODE_VALUES.includes(integration.authMode)) {
    errors.push(`${label}: authMode must be one of [${AUTH_MODE_VALUES.join(', ')}] (got ${JSON.stringify(integration.authMode)})`);
  }

  // embedMode: optional
  if (integration.embedMode !== undefined && !EMBED_MODE_VALUES.includes(integration.embedMode)) {
    errors.push(`${label}: embedMode must be one of [${EMBED_MODE_VALUES.join(', ')}] (got ${JSON.stringify(integration.embedMode)})`);
  }

  // dangerLevel: optional
  if (integration.dangerLevel !== undefined && !DANGER_LEVEL_VALUES.includes(integration.dangerLevel)) {
    errors.push(`${label}: dangerLevel must be one of [${DANGER_LEVEL_VALUES.join(', ')}] (got ${JSON.stringify(integration.dangerLevel)})`);
  }

  // capabilities: optional free-form array (known vocabulary recommended)
  if (integration.capabilities !== undefined) {
    if (!Array.isArray(integration.capabilities)) {
      errors.push(`${label}: capabilities must be an array of strings`);
    } else {
      for (const cap of integration.capabilities) {
        if (typeof cap !== 'string' || !cap.trim()) {
          errors.push(`${label}: capabilities entries must be non-empty strings`);
        } else if (!KNOWN_CAPABILITIES.includes(cap)) {
          warnings.push(`${label}: capability "${cap}" is not in the known vocabulary`);
        }
      }
    }
  }

  // defaultPermissions: optional, must come from the known scope vocabulary
  if (integration.defaultPermissions !== undefined) {
    if (!Array.isArray(integration.defaultPermissions)) {
      errors.push(`${label}: defaultPermissions must be an array`);
    } else {
      for (const perm of integration.defaultPermissions) {
        if (!PERMISSION_SCOPE_VALUES.includes(perm)) {
          errors.push(`${label}: defaultPermissions "${perm}" is not a known permission scope [${PERMISSION_SCOPE_VALUES.join(', ')}]`);
        }
      }
    }
  }

  // statusLabels: optional map of connection state -> label
  if (integration.statusLabels !== undefined) {
    if (!isPlainObject(integration.statusLabels)) {
      errors.push(`${label}: statusLabels must be an object keyed by connection state`);
    } else {
      for (const [state, text] of Object.entries(integration.statusLabels)) {
        if (!CONNECTION_STATE_VALUES.includes(state)) {
          warnings.push(`${label}: statusLabels key "${state}" is not a known connection state`);
        }
        if (typeof text !== 'string' || !text.trim()) {
          errors.push(`${label}: statusLabels.${state} must be a non-empty string`);
        }
      }
    }
  }

  // Cross-field security checks (advisory) ----------------------------------
  const permissions = Array.isArray(integration.defaultPermissions) ? integration.defaultPermissions : [];

  const elevatedWithoutAuth = integration.authMode === AUTH_MODES.NONE
    && permissions.filter((perm) => ELEVATED_PERMISSIONS.includes(perm));
  if (elevatedWithoutAuth && elevatedWithoutAuth.length) {
    warnings.push(`${label}: authMode "none" grants elevated permissions (${elevatedWithoutAuth.join(', ')}) without authentication`);
  }

  const dangerLevel = integration.dangerLevel || DEFAULT_INTEGRATION.dangerLevel;
  const destructive = permissions.filter((perm) => DESTRUCTIVE_PERMISSIONS.includes(perm));
  if (destructive.length && (DANGER_LEVEL_RANK[dangerLevel] ?? 0) < DANGER_LEVEL_RANK[DANGER_LEVELS.ELEVATED]) {
    warnings.push(`${label}: dangerLevel "${dangerLevel}" looks low for destructive permissions (${destructive.join(', ')})`);
  }

  return { errors, warnings };
}

/**
 * Return a normalized integration object with defaults filled in, or `null` if
 * the input is not a valid integration object. Does not mutate the input.
 */
export function normalizeIntegration(integration) {
  if (!isPlainObject(integration)) return null;
  return {
    ...DEFAULT_INTEGRATION,
    ...integration,
    provider: { ...(integration.provider || {}) },
    capabilities: [...(integration.capabilities || [])],
    defaultPermissions: [...(integration.defaultPermissions || [])],
    statusLabels: { ...DEFAULT_STATUS_LABELS, ...(integration.statusLabels || {}) },
  };
}

/** Human label for a connection state, honoring provider overrides. */
export function getStatusLabel(integration, state) {
  const labels = (isPlainObject(integration) && isPlainObject(integration.statusLabels))
    ? { ...DEFAULT_STATUS_LABELS, ...integration.statusLabels }
    : DEFAULT_STATUS_LABELS;
  return labels[state] || DEFAULT_STATUS_LABELS[state] || String(state);
}

/** Whether connecting this integration requires an auth step. */
export function requiresAuth(integration) {
  return Boolean(integration) && integration.authMode != null && integration.authMode !== AUTH_MODES.NONE;
}

/** Ordering comparator for danger levels: negative if a < b. Unknown sorts first. */
export function compareDanger(a, b) {
  return (DANGER_LEVEL_RANK[a] ?? -1) - (DANGER_LEVEL_RANK[b] ?? -1);
}
