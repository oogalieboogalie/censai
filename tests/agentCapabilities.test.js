import { jest } from '@jest/globals';
import request from 'supertest';

// Mock the database pool
const mockClient = {
  query: jest.fn().mockResolvedValue({ rows: [] }),
  release: jest.fn(),
};

const mockPool = {
  query: jest.fn(),
  connect: jest.fn().mockResolvedValue(mockClient),
  on: jest.fn(),
  end: jest.fn(),
};

jest.unstable_mockModule('../server/db.js', () => ({
  default: mockPool,
  createDbPool: () => mockPool,
}));

// Mock DB readiness
jest.unstable_mockModule('../server/dbState.js', () => ({
  dbReady: () => true,
  setDbReady: jest.fn(),
}));

// Mock basic memory queries from individual sub-modules
jest.unstable_mockModule('../server/memory/core/agents.js', () => ({
  getAgent: jest.fn().mockResolvedValue({ id: 'censai', name: 'Censai', role: 'Editorial · research' }),
  getAgents: jest.fn().mockResolvedValue([]),
  getAgentsByIds: jest.fn().mockResolvedValue([]),
  upsertAgent: jest.fn(async (a) => a),
}));

jest.unstable_mockModule('../server/memory/subagents.js', () => ({
  getSubAgentById: jest.fn().mockResolvedValue(null),
  createSubAgent: jest.fn(),
  getSubAgents: jest.fn().mockResolvedValue([]),
  getAllSubAgents: jest.fn().mockResolvedValue([]),
  updateSubAgent: jest.fn(),
  deleteSubAgent: jest.fn(),
  scratchpadWrite: jest.fn(),
  scratchpadRead: jest.fn(),
  scratchpadClear: jest.fn(),
  SUB_AGENT_PRESETS: {},
}));

// Import routing & checks after mocks are registered
const { coreRouter } = await import('../server/routes/agents/core.js');
const { capabilitiesRouter } = await import('../server/routes/agents/capabilities.js');
const { filterToolsForAgent } = await import('../server/tools/rbac/checks.js');

describe('Exoskeleton Agent Capabilities API & Logic', () => {
  let app;

  beforeAll(async () => {
    const express = (await import('express')).default;
    app = express();
    app.use(express.json());
    // Attach user ID mock session
    app.use((req, res, next) => {
      req.session = { userId: 1 };
      next();
    });
    app.use('/api', coreRouter);
    app.use('/api', capabilitiesRouter);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPool.query.mockReset();
    mockClient.query.mockReset();
  });

  describe('API Endpoint GET /api/agents/:id/capabilities', () => {
    test('fetches capabilities from Postgres agent_capabilities table', async () => {
      const mockCapabilities = [
        { capability_id: 'terminal.execute', mode: 'execute_with_approval', scope_type: 'workspace', scope_id: '', source: 'manual', equipped_slot: 'mainHand' }
      ];
      mockPool.query.mockResolvedValueOnce({ rows: mockCapabilities });

      const response = await request(app).get('/api/agents/censai/capabilities');

      expect(response.status).toBe(200);
      expect(response.body.capabilities).toEqual(mockCapabilities);
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT capability_id, mode, scope_type, scope_id, source, equipped_slot FROM agent_capabilities WHERE agent_id = $1',
        ['censai']
      );
    });
  });

  describe('API Endpoint PUT /api/agents/:id/capabilities', () => {
    test('uses transaction to delete existing and insert new capabilities', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // DELETE
        .mockResolvedValueOnce({}) // INSERT
        .mockResolvedValueOnce({}); // COMMIT

      const response = await request(app)
        .put('/api/agents/censai/capabilities')
        .send({
          capabilities: [
            { capability_id: 'browser.use', mode: 'autonomous', scope_type: 'workspace', scope_id: '', source: 'manual', equipped_slot: 'mainHand' }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ ok: true });
      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
      expect(mockClient.query).toHaveBeenNthCalledWith(2, 'DELETE FROM agent_capabilities WHERE agent_id = $1', ['censai']);
      expect(mockClient.query).toHaveBeenNthCalledWith(3, 
        `INSERT INTO agent_capabilities (agent_id, capability_id, mode, scope_type, scope_id, source, equipped_slot)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ['censai', 'browser.use', 'autonomous', 'workspace', '', 'manual', 'mainHand']
      );
      expect(mockClient.query).toHaveBeenNthCalledWith(4, 'COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('filterToolsForAgent tool checks integration', () => {
    test('returns default tools when agent has no active capabilities', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // No active capabilities

      const tools = await filterToolsForAgent('censai');
      const toolNames = tools.map(t => t.function.name);

      // Default tools for Censai: from CORE_AGENT_TOOL_WHITELIST
      expect(toolNames).toContain('web_search');
      expect(toolNames).toContain('remember');
      expect(toolNames).not.toContain('sandbox_exec');
    });

    test('adds tools dynamically when a new capability is equipped', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { capability_id: 'terminal.execute', mode: 'execute_with_approval', scope_type: 'workspace', scope_id: '', source: 'manual', equipped_slot: 'mainHand' }
        ]
      });

      const tools = await filterToolsForAgent('censai');
      const toolNames = tools.map(t => t.function.name);

      // Check default tools are still present
      expect(toolNames).toContain('web_search');
      expect(toolNames).toContain('remember');
      
      // Check that terminal.execute tools are appended dynamically!
      expect(toolNames).toContain('sandbox_exec');
      expect(toolNames).toContain('terminal_run');
    });
  });
});
