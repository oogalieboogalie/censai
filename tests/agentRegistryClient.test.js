// tests/agentRegistryClient.test.js
//
// Unit tests for src/lib/agentRegistry/client.js. The facade wraps
// D2 (REST) + D3 (WS) + a local install set; we exercise:
//   - REST methods: listCards, getCard, createCard, updateCard, deleteCard
//     - query string encoding
//     - 204 → null
//     - non-2xx → Error with status + body
//   - install/uninstall/listInstalled lifecycle via injected storage
//   - WS delegation: subscribeToCard and callCard forward to the wsClient
//   - closeSocket + isReady delegation
//
// Both `fetch` and `wsFactory` are dependency-injected so tests don't
// need a real HTTP server or socket.

import { jest } from '@jest/globals';

const { createRegistryClient, INSTALLED_STORAGE_KEY } = await import('../src/lib/agentRegistry/client.js');

// ─── in-memory storage ──────────────────────────────────────────────────────

function makeStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
    clear: () => map.clear(),
  };
}

// ─── fake fetch ──────────────────────────────────────────────────────────────

function makeFetch(handlers) {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url, init });
    const path = url.split('?')[0];
    const handler = handlers[path];
    if (!handler) throw new Error(`No fake handler for ${path}`);
    return handler({ url, init, calls });
  };
  return Object.assign(fetchImpl, { calls });
}

// ─── fake wsFactory ──────────────────────────────────────────────────────────

function makeWsFactory() {
  const created = [];
  const handlers = new Map(); // cardId → Set<handler>
  const fakeWs = {
    connect: jest.fn(),
    subscribe: jest.fn((cardId, handler) => {
      if (!handlers.has(cardId)) handlers.set(cardId, new Set());
      handlers.get(cardId).add(handler);
      return () => handlers.get(cardId)?.delete(handler);
    }),
    call: jest.fn((cardId, payload, options) => {
      const events = [
        { type: 'call.started', taskId: 't-1' },
        { type: 'call.event', taskId: 't-1', stage: 'plan' },
        { type: 'call.complete', taskId: 't-1', result: { ok: true } },
      ];
      return (async function* () {
        for (const ev of events) yield ev;
      })();
    }),
    isReady: jest.fn(() => true),
    close: jest.fn(),
  };
  const factory = jest.fn((opts) => {
    created.push({ opts, ws: fakeWs });
    return fakeWs;
  });
  return { factory, ws: fakeWs, created, handlers };
}

// ─── tests ──────────────────────────────────────────────────────────────────

describe('createRegistryClient — REST surface', () => {
  test('listCards sends GET /cards and decodes { items, total, limit, offset }', async () => {
    const payload = { items: [{ id: 'agent:architect', name: 'Architect' }], total: 1, limit: 50, offset: 0 };
    const fetchImpl = makeFetch({
      '/api/agent-registry/cards': () => ({ ok: true, status: 200, json: async () => payload }),
    });
    const client = createRegistryClient({ fetch: fetchImpl, storage: makeStorage(), wsFactory: () => ({}) });
    const result = await client.listCards({ visibility: 'public', limit: 50 });
    expect(result).toEqual(payload);
    expect(fetchImpl.calls[0].url).toContain('/api/agent-registry/cards');
    expect(fetchImpl.calls[0].url).toContain('visibility=public');
    expect(fetchImpl.calls[0].url).toContain('limit=50');
    expect(fetchImpl.calls[0].init.method).toBeUndefined();
    expect(fetchImpl.calls[0].init.credentials).toBe('same-origin');
  });

  test('listCards omits empty query params', async () => {
    const fetchImpl = makeFetch({
      '/api/agent-registry/cards': () => ({ ok: true, status: 200, json: async () => ({ items: [], total: 0, limit: 20, offset: 0 }) }),
    });
    const client = createRegistryClient({ fetch: fetchImpl, storage: makeStorage(), wsFactory: () => ({}) });
    await client.listCards();
    expect(fetchImpl.calls[0].url).toBe('/api/agent-registry/cards');
  });

  test('getCard encodes the id and returns the card', async () => {
    const card = { id: 'ext:1:abc', name: 'X' };
    const fetchImpl = makeFetch({
      '/api/agent-registry/cards/ext%3A1%3Aabc': () => ({ ok: true, status: 200, json: async () => card }),
    });
    const client = createRegistryClient({ fetch: fetchImpl, storage: makeStorage(), wsFactory: () => ({}) });
    const out = await client.getCard('ext:1:abc');
    expect(out).toEqual(card);
  });

  test('getCard throws when id is missing', async () => {
    const client = createRegistryClient({ fetch: makeFetch({}), storage: makeStorage(), wsFactory: () => ({}) });
    await expect(client.getCard()).rejects.toThrow(TypeError);
    await expect(client.getCard('')).rejects.toThrow(TypeError);
  });

  test('createCard sends POST with JSON body', async () => {
    const created = { id: 'ext:1:new', name: 'New' };
    const fetchImpl = makeFetch({
      '/api/agent-registry/cards': ({ init }) => {
        expect(init.method).toBe('POST');
        expect(init.headers['Content-Type']).toBe('application/json');
        // The facade passes the body verbatim — visibility defaults happen
        // server-side in D2's createCard handler.
        expect(JSON.parse(init.body)).toEqual({ name: 'New' });
        return { ok: true, status: 201, json: async () => created };
      },
    });
    const client = createRegistryClient({ fetch: fetchImpl, storage: makeStorage(), wsFactory: () => ({}) });
    const out = await client.createCard({ name: 'New' });
    expect(out).toEqual(created);
  });

  test('updateCard strips the path through PATCH', async () => {
    const fetchImpl = makeFetch({
      '/api/agent-registry/cards/agent%3Aarchitect': ({ init }) => {
        expect(init.method).toBe('PATCH');
        expect(JSON.parse(init.body)).toEqual({ description: 'updated' });
        return { ok: true, status: 200, json: async () => ({ id: 'agent:architect', description: 'updated' }) };
      },
    });
    const client = createRegistryClient({ fetch: fetchImpl, storage: makeStorage(), wsFactory: () => ({}) });
    const out = await client.updateCard('agent:architect', { description: 'updated' });
    expect(out.description).toBe('updated');
  });

  test('deleteCard returns null on 204 and calls DELETE', async () => {
    const fetchImpl = makeFetch({
      '/api/agent-registry/cards/agent%3Aarchitect': ({ init }) => {
        expect(init.method).toBe('DELETE');
        return { ok: true, status: 204, json: async () => { throw new SyntaxError('empty body'); } };
      },
    });
    const client = createRegistryClient({ fetch: fetchImpl, storage: makeStorage(), wsFactory: () => ({}) });
    const out = await client.deleteCard('agent:architect');
    expect(out).toBeNull();
  });

  test('non-2xx surfaces an Error with status and body', async () => {
    const fetchImpl = makeFetch({
      '/api/agent-registry/cards/agent%3Aarchitect': () => ({ ok: false, status: 404, json: async () => ({ error: 'Card not found' }) }),
    });
    const client = createRegistryClient({ fetch: fetchImpl, storage: makeStorage(), wsFactory: () => ({}) });
    try {
      await client.getCard('agent:architect');
      throw new Error('expected throw');
    } catch (err) {
      expect(err.message).toBe('Card not found');
      expect(err.status).toBe(404);
      expect(err.body).toEqual({ error: 'Card not found' });
    }
  });

  test('missing fetch in non-browser environments throws', async () => {
    const savedFetch = globalThis.fetch;
    try {
      delete globalThis.fetch;
      expect(() => createRegistryClient({ storage: makeStorage(), wsFactory: () => ({}) })).toThrow(/no fetch available/);
    } finally {
      if (savedFetch !== undefined) globalThis.fetch = savedFetch;
    }
  });
});

describe('createRegistryClient — install set', () => {
  test('installCard + listInstalled returns the entry', () => {
    const storage = makeStorage();
    const client = createRegistryClient({ fetch: makeFetch({}), storage, wsFactory: () => ({}) });
    client.installCard('agent:architect');
    const list = client.listInstalled();
    expect(Object.keys(list)).toEqual(['agent:architect']);
    expect(list['agent:architect'].installedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(list['agent:architect'].settings).toEqual({});
  });

  test('installCard persists to the storage key', () => {
    const storage = makeStorage();
    const client = createRegistryClient({ fetch: makeFetch({}), storage, wsFactory: () => ({}) });
    client.installCard('agent:architect', { role: 'lead' });
    const raw = storage.getItem(INSTALLED_STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw);
    expect(parsed['agent:architect'].settings).toEqual({ role: 'lead' });
  });

  test('hydrates the install set from storage on construction', () => {
    const storage = makeStorage();
    storage.setItem(INSTALLED_STORAGE_KEY, JSON.stringify({
      'agent:censai': { installedAt: '2026-01-01T00:00:00Z', settings: { hue: 145 } },
    }));
    const client = createRegistryClient({ fetch: makeFetch({}), storage, wsFactory: () => ({}) });
    const list = client.listInstalled();
    expect(list['agent:censai'].settings).toEqual({ hue: 145 });
  });

  test('uninstallCard removes the entry and returns true; missing entry returns false', () => {
    const storage = makeStorage();
    const client = createRegistryClient({ fetch: makeFetch({}), storage, wsFactory: () => ({}) });
    client.installCard('agent:architect');
    expect(client.uninstallCard('agent:architect')).toBe(true);
    expect(client.listInstalled()).toEqual({});
    expect(client.uninstallCard('agent:architect')).toBe(false);
  });

  test('isInstalled mirrors listInstalled membership', () => {
    const client = createRegistryClient({ fetch: makeFetch({}), storage: makeStorage(), wsFactory: () => ({}) });
    expect(client.isInstalled('agent:architect')).toBe(false);
    client.installCard('agent:architect');
    expect(client.isInstalled('agent:architect')).toBe(true);
  });

  test('installCard throws without cardId', () => {
    const client = createRegistryClient({ fetch: makeFetch({}), storage: makeStorage(), wsFactory: () => ({}) });
    expect(() => client.installCard('')).toThrow(TypeError);
  });

  test('uninstallCard throws without cardId', () => {
    const client = createRegistryClient({ fetch: makeFetch({}), storage: makeStorage(), wsFactory: () => ({}) });
    expect(() => client.uninstallCard()).toThrow(TypeError);
  });

  test('listInstalled returns a frozen snapshot — callers cannot mutate the cache', () => {
    const client = createRegistryClient({ fetch: makeFetch({}), storage: makeStorage(), wsFactory: () => ({}) });
    client.installCard('agent:architect');
    const list = client.listInstalled();
    expect(Object.isFrozen(list)).toBe(true);
    expect(() => { list['agent:censai'] = { installedAt: 'x' }; }).toThrow();
  });

  test('clearInstalled empties the set', () => {
    const storage = makeStorage();
    const client = createRegistryClient({ fetch: makeFetch({}), storage, wsFactory: () => ({}) });
    client.installCard('a'); client.installCard('b');
    client.clearInstalled();
    expect(client.listInstalled()).toEqual({});
    expect(storage.getItem(INSTALLED_STORAGE_KEY)).toBe('{}');
  });

  test('corrupt JSON in storage falls back to empty', () => {
    const storage = makeStorage();
    storage.setItem(INSTALLED_STORAGE_KEY, '{not valid');
    const client = createRegistryClient({ fetch: makeFetch({}), storage, wsFactory: () => ({}) });
    expect(client.listInstalled()).toEqual({});
  });

  test('null storage (SSR / disabled) still works in memory', () => {
    const client = createRegistryClient({ fetch: makeFetch({}), storage: null, wsFactory: () => ({}) });
    client.installCard('agent:architect');
    expect(client.listInstalled()).toHaveProperty('agent:architect');
  });
});

describe('createRegistryClient — WS delegation', () => {
  test('subscribeToCard forwards to wsClient and triggers connect first', () => {
    const { factory, ws } = makeWsFactory();
    const client = createRegistryClient({ fetch: makeFetch({}), storage: makeStorage(), wsFactory: factory });
    const off = client.subscribeToCard('agent:architect', () => {});
    expect(ws.connect).toHaveBeenCalledTimes(1);
    expect(ws.subscribe).toHaveBeenCalledWith('agent:architect', expect.any(Function));
    expect(typeof off).toBe('function');
  });

  test('callCard returns the AsyncIterable from wsClient.call and triggers connect', async () => {
    const { factory, ws } = makeWsFactory();
    const client = createRegistryClient({ fetch: makeFetch({}), storage: makeStorage(), wsFactory: factory });
    const iter = client.callCard('agent:architect', { msg: 'hi' });
    expect(ws.connect).toHaveBeenCalled();
    const events = [];
    for await (const ev of iter) events.push(ev);
    expect(events.map((e) => e.type)).toEqual(['call.started', 'call.event', 'call.complete']);
  });

  test('isReady and closeSocket delegate to wsClient', () => {
    const { factory, ws } = makeWsFactory();
    const client = createRegistryClient({ fetch: makeFetch({}), storage: makeStorage(), wsFactory: factory });
    expect(client.isReady()).toBe(true);
    client.closeSocket();
    expect(ws.close).toHaveBeenCalled();
  });
});