// src/lib/agentRegistry/client.js
//
// Browser-side facade for the agent registry. Combines:
//   - REST surface (D2): /api/agent-registry/cards/*
//   - WS surface  (D3):  /ws/agent-registry
//   - local install set (workspace-scoped, persisted to localStorage)
//
// One import, one surface — the UI (RegistryWindow, D4) doesn't need to
// reach into two different transport layers or two storage shapes.
//
// Storage key: 'homebase.agentRegistry.installed.v1' — distinct from the
// `homebase.workspace.v1` blob so we don't have to touch the global
// workspace store (which is a load-bearing hot file). See brief divergence
// log for rationale.

import { createAgentRegistryClient } from './wsClient.js';

export const INSTALLED_STORAGE_KEY = 'homebase.agentRegistry.installed.v1';
const BASE_PATH = '/api/agent-registry';

const FETCH_MISS = Symbol('registry.fetch.miss');

function defaultStorage() {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const probe = '__registry_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

async function readJson(res, context) {
  // Empty body is allowed for DELETE (204) — return null.
  if (res.status === 204) return null;
  let data;
  try { data = await res.json(); }
  catch { data = null; }
  if (!res.ok) {
    const message = (data && data.error) || `${context} failed (HTTP ${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

/**
 * Thin REST wrapper. Each method maps 1:1 to a D2 endpoint.
 * @param {object} opts
 * @param {typeof fetch} [opts.fetch]  injected for tests
 */
function createRestClient({ fetch: fetchImpl = (typeof fetch !== 'undefined' ? fetch : null) } = {}) {
  if (!fetchImpl) {
    throw new Error('createRegistryClient: no fetch available — pass one explicitly in non-browser environments');
  }

  async function listCards({ visibility, ownerId, workspaceId, limit, offset } = {}) {
    const params = new URLSearchParams();
    if (visibility) params.set('visibility', visibility);
    if (ownerId) params.set('owner_id', ownerId);
    if (workspaceId) params.set('workspace_id', workspaceId);
    if (limit != null) params.set('limit', String(limit));
    if (offset != null) params.set('offset', String(offset));
    const qs = params.toString();
    const url = `${BASE_PATH}/cards${qs ? `?${qs}` : ''}`;
    const res = await fetchImpl(url, { credentials: 'same-origin' });
    return readJson(res, 'listCards');
  }

  async function getCard(id) {
    if (!id) throw new TypeError('getCard requires id');
    const res = await fetchImpl(`${BASE_PATH}/cards/${encodeURIComponent(id)}`, { credentials: 'same-origin' });
    return readJson(res, 'getCard');
  }

  async function createCard(body) {
    if (!body || typeof body !== 'object') throw new TypeError('createCard requires body');
    const res = await fetchImpl(`${BASE_PATH}/cards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body),
    });
    return readJson(res, 'createCard');
  }

  async function updateCard(id, patch) {
    if (!id) throw new TypeError('updateCard requires id');
    if (!patch || typeof patch !== 'object') throw new TypeError('updateCard requires patch object');
    const res = await fetchImpl(`${BASE_PATH}/cards/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(patch),
    });
    return readJson(res, 'updateCard');
  }

  async function deleteCard(id) {
    if (!id) throw new TypeError('deleteCard requires id');
    const res = await fetchImpl(`${BASE_PATH}/cards/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      credentials: 'same-origin',
    });
    return readJson(res, 'deleteCard');
  }

  return { listCards, getCard, createCard, updateCard, deleteCard };
}

/**
 * Local-storage-backed installed-set. Synchronous reads via the cached
 * `installed` snapshot, async writes flush to storage. The cached
 * snapshot is hydrated once on construction and updated on every mutation
 * so consumers don't have to await reads.
 */
function createInstalledStore({ storage = defaultStorage() } = {}) {
  let installed = {};

  function hydrate() {
    if (!storage) return;
    try {
      const raw = storage.getItem(INSTALLED_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') installed = parsed;
    } catch {
      // Corrupt JSON — start clean.
      installed = {};
    }
  }

  function persist() {
    if (!storage) return;
    try { storage.setItem(INSTALLED_STORAGE_KEY, JSON.stringify(installed)); }
    catch { /* quota / disabled storage — keep the in-memory snapshot */ }
  }

  function list() {
    // Return a shallow clone so callers can't mutate the cache.
    return Object.freeze({ ...installed });
  }

  function install(cardId, settings = {}) {
    if (!cardId) throw new TypeError('install requires cardId');
    installed = {
      ...installed,
      [cardId]: {
        installedAt: new Date().toISOString(),
        settings: settings && typeof settings === 'object' ? settings : {},
      },
    };
    persist();
    return installed[cardId];
  }

  function uninstall(cardId) {
    if (!cardId) throw new TypeError('uninstall requires cardId');
    if (!(cardId in installed)) return false;
    const { [cardId]: _removed, ...rest } = installed;
    installed = rest;
    persist();
    return true;
  }

  function isInstalled(cardId) {
    return Boolean(installed[cardId]);
  }

  function clear() {
    installed = {};
    persist();
  }

  hydrate();
  return { list, install, uninstall, isInstalled, clear };
}

/**
 * Create the registry facade.
 * @param {object} [opts]
 * @param {typeof fetch} [opts.fetch]       REST transport (default: global fetch)
 * @param {Function}     [opts.wsFactory]   WS client factory (default: createAgentRegistryClient)
 * @param {Storage}      [opts.storage]     localStorage-like (default: window.localStorage)
 */
export function createRegistryClient(opts = {}) {
  const rest = createRestClient({ fetch: opts.fetch });
  const installedStore = createInstalledStore({ storage: opts.storage });
  const wsClient = (opts.wsFactory || createAgentRegistryClient)({
    fetch: opts.fetch,
    socketFactory: opts.socketFactory,
  });

  return {
    // REST surface — D2.
    listCards: rest.listCards,
    getCard: rest.getCard,
    createCard: rest.createCard,
    updateCard: rest.updateCard,
    deleteCard: rest.deleteCard,

    // WS surface — D3 (thin re-exports; the wsClient owns lifecycle).
    subscribeToCard(cardId, onEvent) {
      wsClient.connect();
      return wsClient.subscribe(cardId, onEvent);
    },
    callCard(cardId, payload, options) {
      wsClient.connect();
      return wsClient.call(cardId, payload, options);
    },
    isReady() { return wsClient.isReady(); },
    closeSocket() { wsClient.close(); },

    // Local install set — workspace-scoped, persisted via the facade's
    // storage key. See INSTALLED_STORAGE_KEY for the rationale.
    installCard(cardId, settings) { return installedStore.install(cardId, settings); },
    uninstallCard(cardId) { return installedStore.uninstall(cardId); },
    listInstalled() { return installedStore.list(); },
    isInstalled(cardId) { return installedStore.isInstalled(cardId); },
    clearInstalled() { installedStore.clear(); },

    /**
     * Test-only escape hatch — resets the in-memory + storage snapshot
     * to empty. Not part of the public product surface; no UI calls it.
     */
    __resetInstalledForTests() { installedStore.clear(); },
  };
}

// Re-export the WS client factory so callers can construct their own
// (e.g. a window that wants a separate socket per tab). The facade's
// `callCard` / `subscribeToCard` use the facade's own socket, which is
// the common path.
export { createAgentRegistryClient } from './wsClient.js';
export { FETCH_MISS };