// tests/agentRegistryWs.test.js
//
// Server-side tests for the /ws/agent-registry WebSocket endpoint
// and the registryHub pub/sub. Uses an ephemeral HTTP server (port 0)
// and the real `ws` library end-to-end so the protocol is exercised
// against actual frames — no mocks.
//
// Auth: stubs `opts.authenticate` to return a fixed `{ userId }`,
// avoiding a live Postgres session store. The `defaultAuthenticate`
// helper is exercised separately with a fake session store.
//
// Cards: stubs `getAgentCard` via jest.unstable_mockModule so the
// call path doesn't touch the DB.

import { jest } from '@jest/globals';
import http from 'http';
import { WebSocket } from 'ws';

const getAgentCard = jest.fn();
jest.unstable_mockModule('../server/agent-registry/factories.js', () => ({
  getAgentCard,
  __esModule: true,
}));

const {
  attachAgentRegistryWs,
  WS_PATH,
  handleClientMessage,
  defaultAuthenticate,
} = await import('../server/ws/agentRegistry.js');
const {
  subscribe, unsubscribe, publish, listSubscribers,
  subscriptionCount, __resetHubForTests, HUB_LIMITS,
} = await import('../server/ws/registryHub.js');

let server;
const sockets = [];

beforeEach(async () => {
  jest.clearAllMocks();
  __resetHubForTests();
  getAgentCard.mockImplementation(async (id) => (
    id === 'agent:architect' ? { id, name: 'Architect', visibility: 'public', owner_id: null } : null
  ));
  server = http.createServer();
  attachAgentRegistryWs(server, { authenticate: async () => ({ userId: 'tester' }) });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
});

afterEach(async () => {
  for (const s of sockets.splice(0)) {
    try { s.close(); } catch { /* already closed */ }
  }
  await new Promise((r) => server.close(() => r()));
  __resetHubForTests();
});

function openClient(path = WS_PATH) {
  const ws = new WebSocket(`ws://127.0.0.1:${server.address().port}${path}`);
  sockets.push(ws);
  return ws;
}

/**
 * Connect a socket and return a small driver. The driver attaches
 * the message listener IMMEDIATELY after the WebSocket is created —
 * BEFORE awaiting open — because the `ws` library does not buffer
 * frames received before any 'message' listener is registered, and
 * the server emits its `ready` frame synchronously after the
 * upgrade completes. Listening early guarantees the queue catches
 * every frame the test cares about.
 */
async function connect() {
  const ws = openClient();
  const queue = [];
  let resolveNext = null;
  let waiterPredicate = null;
  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    if (waiterPredicate && waiterPredicate(msg)) {
      const r = resolveNext; resolveNext = null; waiterPredicate = null;
      r(msg);
    } else {
      queue.push(msg);
    }
  });
  await new Promise((resolve, reject) => {
    ws.once('open', resolve);
    ws.once('error', reject);
  });
  function next(predicate = () => true, timeoutMs = 2000) {
    const idx = queue.findIndex(predicate);
    if (idx >= 0) return Promise.resolve(queue.splice(idx, 1)[0]);
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolveNext = null;
        waiterPredicate = null;
        reject(new Error('timeout waiting for message'));
      }, timeoutMs);
      resolveNext = resolve;
      waiterPredicate = predicate;
    });
  }
  async function collect(predicate, timeoutMs = 3000) {
    const out = [];
    for (;;) {
      try {
        const msg = await next(predicate, timeoutMs);
        out.push(msg);
        if (msg.type === 'call.complete' || msg.type === 'call.failed') break;
      } catch { break; }
    }
    return out;
  }
  return { ws, next, collect, send: (obj) => ws.send(JSON.stringify(obj)) };
}

// ─── registryHub unit tests ──────────────────────────────────────────

describe('registryHub', () => {
  test('exports the expected limits', () => {
    expect(HUB_LIMITS.maxSubscriptions).toBe(10_000);
    expect(HUB_LIMITS.subscriptionTtlMs).toBe(60 * 60 * 1000);
  });

  test('subscribe + publish round-trip delivers to all subscribers', () => {
    const a = jest.fn(); const b = jest.fn();
    subscribe('agent:architect', 'a', a);
    subscribe('agent:architect', 'b', b);
    const n = publish('agent:architect', { type: 'ping' });
    expect(n).toBe(2);
    expect(a).toHaveBeenCalledWith({ type: 'ping' });
    expect(b).toHaveBeenCalledWith({ type: 'ping' });
  });

  test('unsubscribe drops only the targeted client', () => {
    const a = jest.fn(); const b = jest.fn();
    subscribe('agent:architect', 'a', a);
    subscribe('agent:architect', 'b', b);
    unsubscribe('agent:architect', 'a');
    publish('agent:architect', { type: 'ping' });
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalled();
  });

  test('listSubscribers returns clientIds only (no closures leak)', () => {
    subscribe('agent:architect', 'client-1', () => {});
    subscribe('agent:architect', 'client-2', () => {});
    const list = listSubscribers('agent:architect');
    expect(list.sort()).toEqual(['client-1', 'client-2']);
  });

  test('subscriptionCount reflects active subscribers', () => {
    subscribe('c1', 'a', () => {});
    subscribe('c1', 'b', () => {});
    subscribe('c2', 'a', () => {});
    expect(subscriptionCount()).toBe(3);
    unsubscribe('c1', 'a');
    expect(subscriptionCount()).toBe(2);
  });

  test('publish to a card with no subscribers is a no-op (returns 0)', () => {
    expect(publish('agent:nobody', { type: 'ping' })).toBe(0);
  });

  test('rejects bad arguments', () => {
    expect(() => subscribe('', 'a', () => {})).toThrow(TypeError);
    expect(() => subscribe('c', '', () => {})).toThrow(TypeError);
    expect(() => subscribe('c', 'a', null)).toThrow(TypeError);
  });

  test('one subscriber throwing does not stop the other deliveries', () => {
    const a = jest.fn(() => { throw new Error('boom'); });
    const b = jest.fn();
    subscribe('agent:architect', 'a', a);
    subscribe('agent:architect', 'b', b);
    publish('agent:architect', { type: 'ping' });
    expect(a).toHaveBeenCalled();
    expect(b).toHaveBeenCalled();
  });
});

// ─── protocol tests (live socket) ────────────────────────────────────

describe('WS endpoint protocol', () => {
  test('connect -> ready handshake', async () => {
    const c = await connect();
    const msg = await c.next((m) => m.type === 'ready');
    expect(msg.userId).toBe('tester');
  });

  test('subscribe -> subscribed ack', async () => {
    const c = await connect();
    await c.next((m) => m.type === 'ready');
    c.send({ type: 'subscribe', cardId: 'agent:architect', clientId: 'tester-1' });
    const ack = await c.next((m) => m.type === 'subscribed');
    expect(ack.cardId).toBe('agent:architect');
    expect(ack.clientId).toBe('tester-1');
  });

  test('unsubscribe -> unsubscribed ack', async () => {
    const c = await connect();
    await c.next((m) => m.type === 'ready');
    c.send({ type: 'subscribe', cardId: 'agent:architect', clientId: 'tester-2' });
    await c.next((m) => m.type === 'subscribed');
    c.send({ type: 'unsubscribe', cardId: 'agent:architect', clientId: 'tester-2' });
    const ack = await c.next((m) => m.type === 'unsubscribed');
    expect(ack.cardId).toBe('agent:architect');
  });

  test('publish round-trip via two clients', async () => {
    const a = await connect();
    const b = await connect();
    await a.next((m) => m.type === 'ready');
    await b.next((m) => m.type === 'ready');
    a.send({ type: 'subscribe', cardId: 'agent:architect', clientId: 'a' });
    b.send({ type: 'subscribe', cardId: 'agent:architect', clientId: 'b' });
    await a.next((m) => m.type === 'subscribed');
    await b.next((m) => m.type === 'subscribed');

    publish('agent:architect', { type: 'demo', n: 1 });

    const [msgA, msgB] = await Promise.all([
      a.next((m) => m.type === 'demo'),
      b.next((m) => m.type === 'demo'),
    ]);
    expect(msgA.n).toBe(1);
    expect(msgB.n).toBe(1);
  });

  test('call streams call.started, call.event(s), call.complete to subscribers', async () => {
    const subscriber = await connect();
    const caller = await connect();
    await subscriber.next((m) => m.type === 'ready');
    await caller.next((m) => m.type === 'ready');
    subscriber.send({ type: 'subscribe', cardId: 'agent:architect', clientId: 'watcher' });
    await subscriber.next((m) => m.type === 'subscribed');

    caller.send({ type: 'call', cardId: 'agent:architect', payload: { msg: 'hi' } });
    const events = await subscriber.collect((m) => m.type === 'call.started' || m.type === 'call.event' || m.type === 'call.complete' || m.type === 'call.failed');

    expect(events.length).toBeGreaterThan(0);
    expect(events[0].type).toBe('call.started');
    expect(events[events.length - 1].type).toBe('call.complete');
    expect(events.filter((e) => e.type === 'call.event').length).toBeGreaterThanOrEqual(1);
  });

  test('call against a private card from a non-owner returns call.failed', async () => {
    getAgentCard.mockResolvedValueOnce({ id: 'ext:99:secret', name: 'Secret', visibility: 'private', owner_id: '99' });
    const c = await connect();
    await c.next((m) => m.type === 'ready');
    c.send({ type: 'call', cardId: 'ext:99:secret', payload: 'noop' });
    const failed = await c.next((m) => m.type === 'call.failed');
    expect(failed.error).toBe('not-allowed');
  });

  test('call against a missing card returns call.failed', async () => {
    const c = await connect();
    await c.next((m) => m.type === 'ready');
    c.send({ type: 'call', cardId: 'agent:ghost', payload: 'noop' });
    const failed = await c.next((m) => m.type === 'call.failed');
    expect(failed.error).toBe('card-not-found');
  });

  test('malformed JSON yields an error frame', async () => {
    const c = await connect();
    await c.next((m) => m.type === 'ready');
    c.ws.send('not-json');
    const err = await c.next((m) => m.type === 'error');
    expect(err.reason).toBe('invalid-json');
  });

  test('unknown message type yields an error frame', async () => {
    const c = await connect();
    await c.next((m) => m.type === 'ready');
    c.send({ type: 'bogus' });
    const err = await c.next((m) => m.type === 'error');
    expect(err.reason).toBe('unknown-type:bogus');
  });

  test('subscribe without cardId yields an error frame', async () => {
    const c = await connect();
    await c.next((m) => m.type === 'ready');
    c.send({ type: 'subscribe', clientId: 'no-card' });
    const err = await c.next((m) => m.type === 'error');
    expect(err.reason).toBe('subscribe:cardId-required');
  });

  test('disconnect cleans up the hub subscription', async () => {
    const c = await connect();
    await c.next((m) => m.type === 'ready');
    c.send({ type: 'subscribe', cardId: 'agent:architect', clientId: 'cleanup' });
    await c.next((m) => m.type === 'subscribed');
    expect(listSubscribers('agent:architect')).toContain('cleanup');

    await new Promise((r) => { c.ws.once('close', r); c.ws.close(); });
    await new Promise((r) => setTimeout(r, 50));
    expect(listSubscribers('agent:architect')).not.toContain('cleanup');
  });

  test('rejects unauthenticated upgrades with 401', async () => {
    const noAuthServer = http.createServer();
    attachAgentRegistryWs(noAuthServer, { authenticate: async () => null });
    await new Promise((r) => noAuthServer.listen(0, '127.0.0.1', r));
    const p = noAuthServer.address().port;
    try {
      const ws = new WebSocket(`ws://127.0.0.1:${p}${WS_PATH}`);
      const status = await new Promise((resolve) => {
        ws.once('error', () => resolve(null));
        ws.once('unexpected-response', (_req, res) => resolve(res.statusCode));
        ws.once('open', () => resolve('opened'));
      });
      expect(status).toBe(401);
      try { ws.close(); } catch { /* ignored */ }
    } finally {
      await new Promise((r) => noAuthServer.close(() => r()));
    }
  });

  test('non-matching path upgrades are not handled', async () => {
    const ws = openClient('/other-path');
    const result = await new Promise((resolve) => {
      ws.once('open', () => resolve('opened'));
      ws.once('error', () => resolve('error'));
      ws.once('unexpected-response', (_req, res) => resolve(res.statusCode));
      setTimeout(() => resolve('timeout'), 800);
    });
    expect(result).not.toBe('opened');
    try { ws.terminate(); } catch { /* already closed */ }
  });
});

// ─── defaultAuthenticate unit tests ──────────────────────────────────

describe('defaultAuthenticate', () => {
  function makeReq(cookie) {
    return { headers: cookie ? { cookie } : {} };
  }

  test('returns null without a sessionStore', async () => {
    expect(await defaultAuthenticate(makeReq('connect.sid=s%3Aabc'))).toBeNull();
  });

  test('returns null when there is no cookie', async () => {
    const store = { get: jest.fn() };
    expect(await defaultAuthenticate(makeReq(null), { sessionStore: store })).toBeNull();
    expect(store.get).not.toHaveBeenCalled();
  });

  test('returns null when the cookie has no connect.sid', async () => {
    const store = { get: jest.fn() };
    expect(await defaultAuthenticate(makeReq('foo=bar'), { sessionStore: store })).toBeNull();
  });

  test('returns { userId } when the session store yields one', async () => {
    const store = { get: jest.fn((_sid, cb) => cb(null, { userId: 42 })) };
    const out = await defaultAuthenticate(makeReq('connect.sid=s%3Aabc'), { sessionStore: store });
    expect(out).toEqual({ userId: '42' });
    expect(store.get).toHaveBeenCalledWith('s:abc', expect.any(Function));
  });

  test('returns null when the session is missing', async () => {
    const store = { get: jest.fn((_sid, cb) => cb(null, null)) };
    expect(await defaultAuthenticate(makeReq('connect.sid=xyz'), { sessionStore: store })).toBeNull();
  });

  test('returns null when the session has no userId', async () => {
    const store = { get: jest.fn((_sid, cb) => cb(null, { foo: 'bar' })) };
    expect(await defaultAuthenticate(makeReq('connect.sid=xyz'), { sessionStore: store })).toBeNull();
  });

  test('rejects when the store surfaces an error', async () => {
    const store = { get: jest.fn((_sid, cb) => cb(new Error('db down'))) };
    await expect(defaultAuthenticate(makeReq('connect.sid=xyz'), { sessionStore: store })).rejects.toThrow('db down');
  });
});

// ─── handleClientMessage unit tests (no socket) ──────────────────────

describe('handleClientMessage (unit)', () => {
  function makeFakeWs() {
    const sent = [];
    return {
      OPEN: 1,
      readyState: 1,
      send(data) { sent.push(JSON.parse(data)); },
      sent,
    };
  }

  test('subscribe registers a subscriber and replies subscribed', () => {
    const ws = makeFakeWs();
    const subs = new Set();
    handleClientMessage(ws, { type: 'subscribe', cardId: 'c1', clientId: 'u1' }, { id: 'u1' }, subs);
    expect(ws.sent).toEqual([{ type: 'subscribed', cardId: 'c1', clientId: 'u1' }]);
    expect(subs.has('c1\u0000u1')).toBe(true);
    unsubscribe('c1', 'u1');
  });

  test('unsubscribe removes from the hub and replies unsubscribed', () => {
    const ws = makeFakeWs();
    const subs = new Set();
    handleClientMessage(ws, { type: 'subscribe', cardId: 'c1', clientId: 'u1' }, { id: 'u1' }, subs);
    ws.sent.length = 0;
    handleClientMessage(ws, { type: 'unsubscribe', cardId: 'c1', clientId: 'u1' }, { id: 'u1' }, subs);
    expect(ws.sent).toEqual([{ type: 'unsubscribed', cardId: 'c1', clientId: 'u1' }]);
    expect(subs.size).toBe(0);
    expect(subscriptionCount()).toBe(0);
  });

  test('call validates the card and emits call.started before returning', async () => {
    getAgentCard.mockResolvedValueOnce({ id: 'agent:architect', visibility: 'public', owner_id: null });
    const ws = makeFakeWs();
    const subs = new Set();
    handleClientMessage(ws, { type: 'subscribe', cardId: 'agent:architect', clientId: 'watcher' }, { id: 'w' }, subs);
    ws.sent.length = 0;
    await handleClientMessage(ws, { type: 'call', cardId: 'agent:architect', payload: 'hi' }, { id: 'w' }, subs);
    const started = ws.sent.find((m) => m.type === 'call.started');
    expect(started).toBeTruthy();
    await new Promise((r) => setTimeout(r, 80));
    const complete = ws.sent.find((m) => m.type === 'call.complete');
    expect(complete).toBeTruthy();
    expect(complete.result.cardId).toBe('agent:architect');
    expect(complete.result.echo).toBe('hi');
  });
});