import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSubAgentById } from '../memory.js';
import { getProject, getProjectByName, getProjectByRepoOrPath, listProjects, openProject } from '../workspaces.js';
import { getSecret } from '../secrets.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CURRENT_PROJECT_FILE = path.resolve(path.join(__dirname, '..', '..', process.env.CENSAI_STATE_DIR || '.censai-state', 'current-project.json'));

async function readCurrentProjectState() {
  try {
    const raw = await fs.promises.readFile(CURRENT_PROJECT_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function maybeOpenCurrentProject(agentId, projectName) {
  const current = await readCurrentProjectState();
  if (!current?.path || current.type !== 'local') return null;

  const wanted = String(projectName || '').trim().toLowerCase();
  const currentName = String(current.name || '').trim().toLowerCase();
  const currentPath = String(current.path || '').trim().toLowerCase();
  const pathName = path.basename(current.path).toLowerCase();

  const matches = !wanted ||
    wanted === currentName ||
    wanted === currentPath ||
    wanted === pathName ||
    current.projects?.some(project =>
      String(project.name || '').trim().toLowerCase() === wanted ||
      String(project.path || '').trim().toLowerCase() === wanted ||
      String(project.projectId || '').trim().toLowerCase() === wanted
    );

  if (!matches) return null;
  return openProject(agentId, {
    name: current.name || path.basename(current.path),
    existingPath: current.path,
    summary: current.scopeLabel
      ? `Canvas scoped project: ${current.scopeLabel}`
      : 'Current Censai project',
  });
}

// Resolve which project a tool call should operate against.
// - Sub-agents: bound project (always).
// - Head agents: project name from args, or most-recent if omitted.
// Forgiving lookup: agents often pass "owner/repo" as the project name when the
// project was opened from a GitHub repo (stored under just "repo"). Try the
// literal name first, then fall back to matching the last `/`-segment OR the
// `repo` field directly, before giving up.
export async function resolveProjectForCall(agentId, projectName) {
  const sub = await getSubAgentById(agentId);
  if (sub) {
    if (!sub.project_id) throw new Error('This sub-agent is not bound to a project. Ask your parent agent to recreate you with a project binding.');
    const p = await getProject(sub.project_id);
    if (!p) throw new Error('Bound project no longer exists.');
    return { project: p, isSubAgent: true };
  }
  if (projectName) {
    // 0) Try exact ID match first (handles "agent-project" formats passed by agents or frontend context)
    let p = await getProject(projectName);

    // 1) Exact name match
    if (!p) {
      p = await getProjectByName(agentId, projectName);
    }
    // 2) If name looks like "owner/repo", try just the repo segment
    if (!p && projectName.includes('/')) {
      p = await getProjectByName(agentId, projectName.split('/').pop());
    }
    // 3) Match globally by repo or path. Core projects are shared; owner only
    // records who opened the row first.
    if (!p) {
      p = await getProjectByRepoOrPath(agentId, projectName);
    }
    // 4) If the frontend has a current project selected, materialize it once.
    // This avoids "project not found" when the canvas knows the workspace but
    // the DB has not yet been seeded for the calling agent/process.
    if (!p) {
      p = await maybeOpenCurrentProject(agentId, projectName);
    }
    if (!p) {
      const projects = await listProjects(agentId);
      const projectList = projects.length ? projects.map(x => `"${x.name}"${x.repo ? ` (${x.repo})` : x.path ? ` (${x.path})` : ''}`).join(', ') : 'none';
      throw new Error(`No shared project matching "${projectName}". Available projects: ${projectList}. Use open_project to add the project once; all core agents can use it after that.`);
    }
    return { project: p, isSubAgent: false };
  }
  const projects = await listProjects(agentId);
  if (!projects[0]) {
    const current = await maybeOpenCurrentProject(agentId, null);
    if (current) return { project: current, isSubAgent: false };
    throw new Error('There are no shared projects yet. Use open_project to create one.');
  }
  return { project: projects[0], isSubAgent: false };
}

export async function resolveLocalProjectRoot(agentId, projectName) {
  if (!projectName) return null;
  const { project } = await resolveProjectForCall(agentId, projectName);
  if (project?.repo) {
    throw new Error(`Project "${project.name}" is GitHub-backed. Runtime tools need a local project path.`);
  }
  if (!project?.path) {
    throw new Error(`Project "${project.name || projectName}" does not have a local path.`);
  }
  return project.path;
}

export async function fetchGithub(endpoint, options = {}) {
  const token = getSecret('GITHUB_TOKEN');
  if (!token) throw new Error('GITHUB_TOKEN not configured in .env');
  const needsContentType = options.method && ['POST', 'PUT', 'PATCH'].includes(options.method.toUpperCase());
  const res = await fetch(`https://api.github.com${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Censai-Agent',
      ...(needsContentType ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API error ${res.status}: ${text}`);
  }
  return res.json();
}

export function localApiUrl(path) {
  const port = process.env.PORT || 3001;
  const base = process.env.INTERNAL_API_BASE_URL || `http://127.0.0.1:${port}`;
  return `${base}${path}`;
}
