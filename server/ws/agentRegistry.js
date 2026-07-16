// server/ws/agentRegistry.js
//
// WebSocket endpoint for A2A-style task delegation. Mounted at
// /ws/agent-registry by attachAgentRegistryWs(server). Follows the
// noServer pattern from server/terminal/sessions.js so a single HTTP
// server can host multiple WS upgrades.
//
// Auth: the upgrade handler resolves the actor from the connect.sid
// cookie via the same Postgres session store the REST API uses
// (Store#get contract: async (sid, cb) -> sess|null). Tests inject
// an `authenticate` stub via `opts`.
//
// Protocol (server -> client): ready, subscribed, unsubscribed,
// call.started, call.event, call.complete, call.failed, error, ping.
// Protocol (client -> server): subscribe, unsubscribe, call, pong.
// Heartbeat: pings every HEARTBEAT_MS; close 4001 after HEARTBEAT_GRACE_MS.

import crypto from 'crypto';
import { WebSocketServer } from 'ws';
import { subscribe, unsubscribe, publish } from './registryHub.js';
import { getAgentCard } from '../agent-registry/factories.js';
import { createLogger } from '../logger.js';

const log = createLogger('agent-registry-ws');

export const WS_PATH = '/ws/agent-registry';
const HEARTBEAT_MS = 30_000;
const HEARTBEAT_GRACE_MS = HEARTBEAT_MS * 3;
const MAX_MESSAGE_BYTES = 256 * 1024;

function safeSend(ws, payload) {
  if (ws.readyState !== ws.OPEN) return false;
  try { ws.send(JSON.stringify(payload)); return true; }
  catch (err) { log.warn('send failed', { error: err.message }); return false; }
}

function parseCookieSid(req) {
  const header = req?.headers?.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    if (part.slice(0, idx).trim() !== 'connect.sid') continue;
    const v = part.slice(1 + idx).trim();
    return v ? decodeURIComponent(v) : null;
  }
  return null;
}

/** Default upgrade-time authenticator: connect.sid cookie -> session store. */
export async function defaultAuthenticate(req, { sessionStore } = {}) {
  if (!sessionStore || typeof sessionStore.get !== 'function') return null;
  const sid = parseCookieSid(req);
  if (!sid) return null;
  const sess = await new Promise((resolve, reject) => {
    try {
      sessionStore.get(sid, (err, value) => err ? reject(err) : resolve(value || null));
    } catch (err) { reject(err); }
  });
  if (!sess || !sess.userId) return null;
  return { userId: String(sess.userId) };
}

/**
 * Attach the agent-registry WS endpoint to `server` (an http.Server).
 * `opts.authenticate` overrides the default session-cookie auth
 * (tests pass a stub); `opts.sessionStore` is required otherwise.
 */
export function attachAgentRegistryWs(server, opts = {}) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_MESSAGE_BYTES });
  const authenticate = opts.authenticate || ((req) => defaultAuthenticate(req, opts));

  server.on('upgrade', (request, socket, head) => {
    let requestUrl;
    try { requestUrl = new URL(request.url || '/', 'http://localhost'); }
    catch { socket.destroy(); return; }
    if (requestUrl.pathname !== WS_PATH) {
      // Unhandled path — destroy so the client does not hang in
      // CONNECTING forever (terminal WS takes /api/terminal earlier).
      socket.destroy();
      return;
    }
    authenticate(request).then((actor) => {
      if (!actor || !actor.userId) {
        log.info('rejecting unauthenticated upgrade');
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request, actor);
      });
    }).catch((err) => {
      log.error('upgrade auth failed', { error: err.message });
      socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
      socket.destroy();
    });
  });

  wss.on('connection', (ws, _request, actor) => {
    const subscriptions = new Set();
    let lastPongAt = Date.now();
    let isAlive = true;

    const beat = () => {
      if (!isAlive || Date.now() - lastPongAt > HEARTBEAT_GRACE_MS) {
        log.info('heartbeat-timeout, closing', { userId: actor.userId });
        try { ws.close(4001, 'heartbeat-timeout'); } catch { /* already closing */ }
        return;
      }
      isAlive = false;
      safeSend(ws, { type: 'ping', ts: Date.now() });
    };
    const heartbeatTimer = setInterval(beat, HEARTBEAT_MS);
    ws.once('close', () => clearInterval(heartbeatTimer));

    safeSend(ws, { type: 'ready', userId: actor.userId });

    ws.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(raw.toString()); }
      catch { safeSend(ws, { type: 'error', reason: 'invalid-json' }); return; }
      if (!msg || typeof msg !== 'object') {
        safeSend(ws, { type: 'error', reason: 'invalid-message' });
        return;
      }
      handleClientMessage(ws, msg, actor, subscriptions).catch((err) => {
        log.warn('handler error', { type: msg.type, error: err.message });
        safeSend(ws, { type: 'error', reason: err.message || 'internal-error' });
      });
    });

    ws.on('pong', () => { lastPongAt = Date.now(); isAlive = true; });

    ws.on('close', () => {
      for (const key of subscriptions) {
        const idx = key.indexOf('\u0000');
        if (idx < 0) continue;
        unsubscribe(key.slice(0, idx), key.slice(1 + idx));
      }
      subscriptions.clear();
    });

    ws.on('error', (err) => log.warn('socket error', { userId: actor.userId, error: err.message }));
  });

  return wss;
}

// Mirrors the REST call guard in server/routes/agentRegistry/invoke.js:
// public + workspace need any authenticated actor; private needs the owner.
function canInvokeCard(card, actor) {
  if (!card || !actor) return false;
  if (card.visibility === 'public' || card.visibility === 'workspace') return true;
  if (card.visibility === 'private') return card.owner_id === actor.id;
  return false;
}

/**
 * Validate the actor + card for a `call` message and emit a
 * deterministic A2A-shaped event stream through `publish`. Until
 * the full executor lands this synthesises the stream; clients can
 * wire subscribe-and-call end-to-end today. Real implementations
 * will replace the setImmediate block with the task worker.
 */
async function runCall({ actor, cardId, payload, options, publish }) {
  const card = await getAgentCard(cardId);
  if (!card) return { ok: false, error: 'card-not-found' };
  if (!canInvokeCard(card, actor)) return { ok: false, error: 'not-allowed' };

  const taskId = crypto.randomUUID();
  const startedAt = Date.now();
  publish({ type: 'call.started', taskId, cardId, startedAt });

  setImmediate(async () => {
    try {
      const stages = ['planning', 'retrieving-context', 'executing', 'synthesising'];
      let progress = 0;
      for (const stage of stages) {
        progress += 25;
        await new Promise((r) => setTimeout(r, 5));
        publish({ type: 'call.event', taskId, stage, progress, payloadEcho: payload ?? null });
      }
      publish({
        type: 'call.complete', taskId, cardId,
        result: { cardId, echo: payload ?? null, options: options ?? null, durationMs: Date.now() - startedAt },
      });
    } catch (err) {
      publish({ type: 'call.failed', taskId, cardId, error: err.message || 'unknown' });
    }
  });

  return { ok: true, taskId };
}

/** Per-message handler — exported so tests can drive it with a fake `ws`. */
export async function handleClientMessage(ws, msg, actor, subscriptions) {
  switch (msg.type) {
    case 'subscribe': {
      const { cardId, clientId } = msg;
      if (typeof cardId !== 'string' || !cardId) return safeSend(ws, { type: 'error', reason: 'subscribe:cardId-required' });
      if (typeof clientId !== 'string' || !clientId) return safeSend(ws, { type: 'error', reason: 'subscribe:clientId-required' });
      subscribe(cardId, clientId, (event) => safeSend(ws, event));
      subscriptions.add(`${cardId}\u0000${clientId}`);
      return safeSend(ws, { type: 'subscribed', cardId, clientId });
    }
    case 'unsubscribe': {
      const { cardId, clientId } = msg;
      if (typeof cardId !== 'string' || typeof clientId !== 'string') return safeSend(ws, { type: 'error', reason: 'unsubscribe:bad-args' });
      unsubscribe(cardId, clientId);
      subscriptions.delete(`${cardId}\u0000${clientId}`);
      return safeSend(ws, { type: 'unsubscribed', cardId, clientId });
    }
    case 'call': {
      const { cardId, payload, options } = msg;
      if (typeof cardId !== 'string' || !cardId) return safeSend(ws, { type: 'error', reason: 'call:cardId-required' });
      const result = await runCall({ actor, cardId, payload, options, publish: (event) => publish(cardId, event) });
      if (!result.ok) return safeSend(ws, { type: 'call.failed', error: result.error });
      return undefined;
    }
    case 'pong':
      return undefined;
    default:
      return safeSend(ws, { type: 'error', reason: `unknown-type:${msg.type}` });
  }
}