import path from 'path';
import * as pty from 'node-pty';
import { isDockerAvailable, ensureSandbox, sandboxShellArgv } from '../sandbox/index.js';
import { log, ptyOptions } from './shared.js';

async function spawnSandboxBackend(cwd, size) {
  const { name } = await ensureSandbox(cwd);
  const proc = pty.spawn('docker', sandboxShellArgv(name), ptyOptions(size));
  return { proc, label: `Docker sandbox (${name})`, isSandbox: true, shell: 'bash' };
}

function spawnWslShell(cwd, size) {
  const proc = pty.spawn('wsl.exe', ['--cd', cwd], ptyOptions(size, cwd));
  return { proc, label: 'WSL shell', isSandbox: false, shell: 'bash' };
}

function spawnHostShell(cwd, size) {
  const isWin = process.platform === 'win32';
  const shell = isWin
    ? (process.env.ComSpec || 'powershell.exe')
    : (process.env.SHELL || '/bin/bash');
  const proc = pty.spawn(shell, [], ptyOptions(size, cwd));
  const base = path.basename(shell).toLowerCase();
  const shellFamily = base.includes('powershell') || base.includes('pwsh')
    ? 'powershell'
    : base.includes('cmd')
      ? 'cmd'
      : 'bash';
  return { proc, label: `Host shell (${path.basename(shell)})`, isSandbox: false, shell: shellFamily };
}

export async function startBackend(cwd, hasProject, size) {
  if (hasProject && await isDockerAvailable()) {
    try {
      return await spawnSandboxBackend(cwd, size);
    } catch (err) {
      log.warn('sandbox backend failed, falling back', { cwd, error: err.message });
    }
  }
  if (process.platform === 'win32') {
    try {
      return spawnWslShell(cwd, size);
    } catch (err) {
      log.warn('WSL backend failed, falling back to host shell', { error: err.message });
    }
  }
  return spawnHostShell(cwd, size);
}
