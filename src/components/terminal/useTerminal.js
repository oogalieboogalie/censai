import React, { useRef, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { createLogger } from '../../lib/logger.js';

const log = createLogger('terminal');

function getTerminalSocketUrl(cwd, sessionId) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const params = new URLSearchParams();
  if (cwd) params.set('cwd', cwd);
  if (sessionId) params.set('sessionId', sessionId);
  return `${protocol}//${window.location.host}/api/terminal?${params.toString()}`;
}

export function useTerminal(hostRef, win, cwd, theme) {
  const termRef = useRef(null);
  const socketRef = useRef(null);
  
  const agentEnabled = Boolean(win.agentEnabled);
  const attachedAgents = win.attachedAgents || [];
  const bindStateRef = useRef(null);
  bindStateRef.current = { agentEnabled, agentIds: attachedAgents };
  
  const sendBind = useCallback(() => {
    const s = socketRef.current;
    if (s && s.readyState === 1) s.send(JSON.stringify({ type: 'bind', ...bindStateRef.current }));
  }, []);

  React.useEffect(() => {
    if (!hostRef.current) return undefined;

    const term = new Terminal({
      cursorBlink: true,
      convertEol: true,
      fontFamily: 'var(--font-mono)',
      fontSize: theme.fontSize || 13,
      lineHeight: 1.25,
      theme: theme,
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(hostRef.current);
    termRef.current = term;

    const socketUrl = getTerminalSocketUrl(cwd, win.id);
    const socket = new WebSocket(socketUrl);
    socketRef.current = socket;
    log.debug('connecting', { cwd });

    socket.addEventListener('open', () => {
      log.info('socket open', { cwd });
      term.writeln('Connecting to shell…');
      sendBind();
    });
    socket.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'meta' && message.backend) {
          log.info('backend connected', { backend: message.backend });
          term.writeln(`Connected — ${message.backend}.`);
        }
        if (message.type === 'output') term.write(message.data);
        if (message.type === 'exit') {
          log.info('shell exited', { code: message.code ?? 0 });
          term.writeln(`\r\nProcess exited with code ${message.code ?? 0}.`);
        }
      } catch {
        term.write(String(event.data || ''));
      }
    });
    socket.addEventListener('close', () => {
      log.info('socket closed', { cwd });
      term.writeln('\r\nTerminal disconnected.');
    });
    socket.addEventListener('error', () => {
      log.error('socket error', { cwd, url: socketUrl });
      term.writeln('\r\nTerminal connection failed.');
    });

    const inputDisposable = term.onData((data) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'input', data }));
      }
    });

    const resize = () => {
      if (!hostRef.current) return;
      try {
        fitAddon.fit();
      } catch {
        return;
      }
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
      }
    };
    const observer = new ResizeObserver(resize);
    observer.observe(hostRef.current);
    resize();

    return () => {
      observer.disconnect();
      inputDisposable.dispose();
      socket.close();
      term.dispose();
      termRef.current = null;
      socketRef.current = null;
    };
  }, [cwd, theme, win.id, sendBind]);

  React.useEffect(() => {
    sendBind();
  }, [agentEnabled, attachedAgents.join(','), sendBind]);

  return { termRef };
}
