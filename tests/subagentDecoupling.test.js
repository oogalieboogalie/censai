import { jest } from '@jest/globals';

const mockGetSubAgentById = jest.fn();
const mockGetAgent = jest.fn();

jest.unstable_mockModule('../server/memory.js', () => ({
  getSubAgentById: mockGetSubAgentById,
  getAgent: mockGetAgent,
}));

const mockGetProject = jest.fn();
const mockGetProjectByName = jest.fn();
const mockGetProjectByRepoOrPath = jest.fn();
const mockListProjects = jest.fn();
const mockOpenProject = jest.fn();

jest.unstable_mockModule('../server/workspaces.js', () => ({
  getProject: mockGetProject,
  getProjectByName: mockGetProjectByName,
  getProjectByRepoOrPath: mockGetProjectByRepoOrPath,
  listProjects: mockListProjects,
  openProject: mockOpenProject,
}));

const mockQuery = jest.fn();
jest.unstable_mockModule('../server/db.js', () => {
  const mockPool = {
    query: mockQuery,
    connect: jest.fn(),
    on: jest.fn(),
    end: jest.fn(),
  };
  return {
    default: mockPool,
    createDbPool: () => mockPool
  };
});

// Import modules under test after mock registration
const { resolveProjectForCall } = await import('../server/tools/helpers.js');
const { filterToolsForAgent } = await import('../server/tools/definitions.js');

describe('Sub-Agent Project Decoupling and Custom Tool Scopes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSubAgentById.mockReset();
    mockGetAgent.mockReset();
    mockGetProject.mockReset();
    mockGetProjectByName.mockReset();
    mockGetProjectByRepoOrPath.mockReset();
    mockListProjects.mockReset();
    mockOpenProject.mockReset();
    mockQuery.mockReset();
  });

  describe('resolveProjectForCall for sub-agents', () => {
    test('Case A: sub-agent bound to a project in DB', async () => {
      mockGetSubAgentById.mockResolvedValue({ id: 'sub-1', project_id: 'proj-db' });
      const mockProject = { id: 'proj-db', name: 'Project DB' };
      mockGetProject.mockResolvedValue(mockProject);

      const result = await resolveProjectForCall('sub-1', null);
      expect(result.project).toEqual(mockProject);
      expect(result.isSubAgent).toBe(true);
    });

    test('Case B: unbound sub-agent resolves via task context project ID', async () => {
      mockGetSubAgentById.mockResolvedValue({ id: 'sub-1', project_id: null });
      mockQuery.mockResolvedValue({ rows: [{ project_id: 'proj-task', project: null }] });

      const mockProject = { id: 'proj-task', name: 'Project Task' };
      mockGetProject.mockResolvedValue(mockProject);

      const result = await resolveProjectForCall('sub-1', null, { agentTaskId: 'task-123' });
      expect(result.project).toEqual(mockProject);
      expect(result.isSubAgent).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('SELECT project_id'), ['task-123']);
    });

    test('Case C: unbound sub-agent resolves via task context project name', async () => {
      mockGetSubAgentById.mockResolvedValue({ id: 'sub-1', project_id: null });
      mockQuery.mockResolvedValue({ rows: [{ project_id: null, project: 'proj-name' }] });

      const mockProject = { id: 'proj-resolved', name: 'proj-name' };
      mockGetProject.mockResolvedValue(null);
      mockGetProjectByName.mockResolvedValue(mockProject);

      const result = await resolveProjectForCall('sub-1', null, { agentTaskId: 'task-123' });
      expect(result.project).toEqual(mockProject);
      expect(result.isSubAgent).toBe(true);
    });

    test('Case D: unbound sub-agent, no task context, falls back to first open project', async () => {
      mockGetSubAgentById.mockResolvedValue({ id: 'sub-1', project_id: null });

      const mockProject = { id: 'proj-first', name: 'First Open Project' };
      mockListProjects.mockResolvedValue([mockProject]);

      const result = await resolveProjectForCall('sub-1', null);
      expect(result.project).toEqual(mockProject);
      expect(result.isSubAgent).toBe(true);
    });

    test('Case E: unbound sub-agent resolves using explicit projectName argument', async () => {
      mockGetSubAgentById.mockResolvedValue({ id: 'sub-1', project_id: null });

      const mockProject = { id: 'proj-explicit', name: 'Explicit Project' };
      mockGetProject.mockResolvedValue(mockProject);

      const result = await resolveProjectForCall('sub-1', 'proj-explicit');
      expect(result.project).toEqual(mockProject);
      expect(result.isSubAgent).toBe(true);
    });
  });

  describe('filterToolsForAgent with custom tool scopes', () => {
    test('filters tools to custom scopes if defined', async () => {
      const customScopes = { mode: 'custom', tools: ['remember', 'web_search'] };
      mockGetSubAgentById.mockResolvedValue({ id: 'sub-1', permission: 'worker', tool_scopes: customScopes });
      mockQuery.mockResolvedValue({ rows: [] }); // capability lookup

      const tools = await filterToolsForAgent('sub-1');
      const names = tools.map(t => t.function.name);
      
      expect(names).toContain('remember');
      expect(names).not.toContain('run_tests');
    });
  });
});
