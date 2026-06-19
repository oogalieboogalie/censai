import crypto from 'crypto';
import { WebSocketServer } from 'ws';
import { startBackend } from './backends.js';
import { 
  log, sessions, resolveCwd, safeJsonSend, broadcast, appendScrollback,
  AGENT_IDLE_REAP_MS, REAP_GRACE_MS
} from './shared.js';

export function getTerminalSession(sessionId) {
  return sessions.get(sessionId) || null;
}

async function createSession(sessionId, { cwd, hasProject, size }) {
  const backend = await startBackend(cwd, hasProject, size);
  const session = {
    id: sessionId,
    pty: backend.proc,
    sockets: new Set(),
    cwd,
    backendLabel: backend.label,
    isSandbox: Boolean(backend.isSandbox),
    shell: backend.shell || 'bash',
    agentEnabled: false,
    boundAgentIds: new Set(),
    busy: false,
    scrollback: '',
    alive: true,
    createdAt: Date.now(),
    lastActivity: Date.now(),
    reapTimer: null,
  };
  sessions.set(sessionId, session);

  backend.proc.onData((data) => {
    session.lastActivity = Date.now();
    appendScrollback(session, data);
    broadcast(session, { type: 'output', data });
  });

  backend.proc.onExit(({ exitCode }) => {
    session.alive = false;
    log.info('shell exited', { sessionId, backend: backend.label, code: exitCode });
    broadcast(session, { type: 'exit', code: exitCode });
    for (const ws of session.sockets) {
      try { ws.close(); } catch { /* already closing */ }
    }
    if (session.reapTimer) clearTimeout(session.reapTimer);
    sessions.delete(sessionId);
  });

  log.info('session created', { sessionId, backend: backend.label, pid: backend.proc.pid, isSandbox: session.isSandbox });
  return session;
}

function scheduleReap(session) {
  if (session.reapTimer) clearTimeout(session.reapTimer);
  const keepForAgent = session.agentEnabled && session.boundAgentIds.size > 0;
  const delay = keepForAgent ? AGENT_IDLE_REAP_MS : REAP_GRACE_MS;
  session.reapTimer = setTimeout(() => {
    if (sessions.get(session.id) !== session) return;
    if (session.sockets.size > 0) return;
    if (keepForAgent && Date.now() - session.lastActivity < AGENT_IDLE_REAP_MS) {
      scheduleReap(session);
      return;
    }
    try { session.pty.kill(); } catch { /* already dead */ }
    sessions.delete(session.id);
    log.info('session reaped', { sessionId: session.id, keptForAgent: keepForAgent });
  }, delay);
}

export function attachTerminalServer(server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const requestUrl = new URL(request.url || '/', 'http://localhost');
    if (requestUrl.pathname !== '/api/terminal') return;

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request, requestUrl);
    });
  });

  wss.on('connection', async (ws, _request, requestUrl) => {
    const params = requestUrl.searchParams;
    const rawCwd = params.get('cwd');
    const hasProject = Boolean(rawCwd && rawCwd.trim());
    const cwd = resolveCwd(rawCwd);
    const size = {
      cols: Math.max(2, parseInt(params.get('cols'), 10) || 80),
      rows: Math.max(1, parseInt(params.get('rows'), 10) || 24),
    };
    const sessionId = (params.get('sessionId') || '').trim() || `eph-${crypto.randomUUID()}`;

    let session = sessions.get(sessionId);
    if (session && !session.alive) {
      sessions.delete(sessionId);
      session = null;
    }
    const isNew = !session;
    if (!session) {
      try {
        session = await createSession(sessionId, { cwd, hasProject, size });
      } catch (error) {
        log.error('failed to start any backend', { sessionId, cwd, error: error.message });
        safeJsonSend(ws, { type: 'output', data: `\r\nFailed to start a terminal: ${error.message}\r\n` });
        ws.close();
        return;
      }
    }

    if (session.reapTimer) { clearTimeout(session.reapTimer); session.reapTimer = null; }
    session.sockets.add(ws);

    log.info('connection open', { sessionId, joined: !isNew, viewers: session.sockets.size });
    safeJsonSend(ws, { type: 'meta', cwd: session.cwd, backend: session.backendLabel });
    if (!isNew && session.scrollback) {
      safeJsonSend(ws, { type: 'output', data: session.scrollback, replay: true });
    }

    ws.on('message', (raw) => {
      if (!session.alive) return;
      let message;
      try {
        message = JSON.parse(raw.toString());
      } catch {
        session.pty.write(raw.toString());
        return;
      }
      if (message.type === 'input' && typeof message.data === 'string') {
        session.lastActivity = Date.now();
        session.pty.write(message.data);
      } else if (message.type === 'resize') {
        const cols = Math.max(2, parseInt(message.cols, 10) || size.cols);
        const rows = Math.max(1, parseInt(message.rows, 10) || size.rows);
        try { session.pty.resize(cols, rows); } catch { /* shell already gone */ }
      } else if (message.type === 'bind') {
        session.agentEnabled = Boolean(message.agentEnabled);
        session.boundAgentIds = new Set(
          Array.isArray(message.agentIds) ? message.agentIds.filter((x) => typeof x === 'string') : []
        );
        log.debug('session bind', { sessionId, agentEnabled: session.agentEnabled, agents: session.boundAgentIds.size });
      }
    });

    ws.on('close', () => {
      session.sockets.delete(ws);
      if (session.sockets.size === 0) scheduleReap(session);
    });
  });

  return wss;
}
