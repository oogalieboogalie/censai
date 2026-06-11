import fs from 'fs';
import path from 'path';

export function mapProjectPathForRuntime(projectPath) {
  const raw = String(projectPath || '');
  const hostRoot = process.env.CENSAI_HOST_PROJECT_ROOT;
  const containerRoot = process.env.CENSAI_CONTAINER_PROJECT_ROOT;
  if (!raw) return raw;

  const normalizedContainer = containerRoot?.replace(/\\/g, '/').replace(/\/+$/, '');
  if (hostRoot && containerRoot) {
    const normalizedRaw = raw.replace(/\\/g, '/').toLowerCase();
    const normalizedHost = hostRoot.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
    if (normalizedRaw === normalizedHost || normalizedRaw.startsWith(`${normalizedHost}/`)) {
      const suffix = raw.replace(/\\/g, '/').slice(hostRoot.replace(/\\/g, '/').replace(/\/+$/, '').length);
      return path.posix.join(containerRoot, suffix);
    }
  }

  if (normalizedContainer && fs.existsSync(normalizedContainer)) {
    const rawParts = raw.replace(/\\/g, '/').split('/').filter(Boolean);
    const containerParts = normalizedContainer.split('/').filter(Boolean);
    const rawProjectName = rawParts[rawParts.length - 1]?.toLowerCase();
    const containerProjectName = containerParts[containerParts.length - 1]?.toLowerCase();
    if (rawProjectName && rawProjectName === containerProjectName) {
      return normalizedContainer;
    }
  }

  return raw;
}
