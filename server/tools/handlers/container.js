import { runnerClient } from '../../runner/client.js';

const PROJECT_ROOT = process.cwd();

async function runDockerCompose(args, options = {}) {
  return runnerClient.exec('docker', ['compose', ...args], {
    cwd: PROJECT_ROOT,
    ...options,
  });
}

export async function listContainers() {
  try {
    const { stdout, code, stderr } = await runDockerCompose(['ps', '--format', 'json']);
    if (code !== 0) throw new Error(stderr || `Docker exit ${code}`);
    const lines = stdout.trim().split('\n').filter(Boolean);
    if (lines.length === 0) return [];

    // docker compose ps --format json may output one JSON object per line
    const services = lines.map(line => {
      try { return JSON.parse(line); } catch { return null; }
    }).filter(Boolean);

    return services;
  } catch (err) {
    if (err.code === 'ENOENT' || (err.message && err.message.includes('not found'))) {
      throw new Error('Docker is not available on this system. Make sure Docker Desktop is installed and running.');
    }
    throw err;
  }
}

export async function getContainerLogs(service, lines = 50) {
  try {
    const { stdout, stderr, code } = await runDockerCompose(
      ['logs', `--tail=${lines}`, service]
    );
    if (code !== 0 && code !== null) {
       throw new Error(stderr || `Docker logs exit ${code}`);
    }
    const output = (stdout + stderr).trim();
    return output || `No log output for service "${service}".`;
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error('Docker is not available on this system.');
    }
    const combined = ((err.stdout || '') + (err.stderr || '')).trim();
    throw new Error(`container_logs error for "${service}": ${combined || err.message}`);
  }
}

export async function restartContainer(service) {
  try {
    const { code, stderr } = await runDockerCompose(['restart', service]);
    if (code !== 0) throw new Error(stderr || `Docker restart exit ${code}`);
    return `Service "${service}" restarted successfully.`;
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error('Docker is not available on this system.');
    }
    const combined = ((err.stdout || '') + (err.stderr || '')).trim();
    throw new Error(`restart_service error for "${service}": ${combined || err.message}`);
  }
}

export async function handleContainerTool(agentId, name, args) {
  switch (name) {
    case 'container_status': {
      try {
        const services = await listContainers();
        if (services.length === 0) return 'No containers found. Is docker-compose up?';

        const header = 'SERVICE'.padEnd(20) + 'STATUS'.padEnd(20) + 'PORTS';
        const divider = '-'.repeat(80);
        const rows = services.map(s => {
          const svc = (s.Service || s.Name || s.service || '').padEnd(20);
          const status = (s.Status || s.State || '').padEnd(20);
          const ports = Array.isArray(s.Publishers)
            ? s.Publishers.map(p => `${p.PublishedPort || ''}→${p.TargetPort || ''}`).join(', ')
            : (s.Ports || '');
          return svc + status + ports;
        }).join('\n');

        return `CONTAINER STATUS\n${header}\n${divider}\n${rows}`;
      } catch (err) {
        return err.message;
      }
    }

    case 'container_logs': {
      const service = args.service || 'homebase';
      const lines = args.lines || 50;
      try {
        return await getContainerLogs(service, lines);
      } catch (err) {
        return err.message;
      }
    }

    case 'restart_service': {
      const service = args.service || 'homebase';
      try {
        return await restartContainer(service);
      } catch (err) {
        return err.message;
      }
    }

    default:
      throw new Error(`Unknown container tool: ${name}`);
  }
}
