import { jest } from '@jest/globals';

// Mock the database pool
jest.unstable_mockModule('../server/db.js', () => {
  const mockPool = {
    query: jest.fn(),
    connect: jest.fn(),
    on: jest.fn(),
    end: jest.fn(),
    ended: false
  };
  return {
    default: mockPool,
    createDbPool: () => mockPool
  };
});

// Mock Qdrant and embeddings to keep tests lightweight and database-only
jest.unstable_mockModule('../server/embeddings.js', () => ({
  embed: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
  embeddingsAvailable: jest.fn().mockReturnValue(true)
}));

jest.unstable_mockModule('../server/qdrant.js', () => ({
  upsertVector: jest.fn().mockResolvedValue(true),
  searchVectors: jest.fn().mockResolvedValue([])
}));

const { default: pool } = await import('../server/db.js');
const { embeddingsAvailable } = await import('../server/embeddings.js');
const {
  getAgent,
  getAgentsByIds,
  loadAgentContext,
  recallMemories,
  storeMemory,
} = await import('../server/memory/core.js');
const { filterToolsForAgent } = await import('../server/tools/definitions.js');
const { executeTool } = await import('../server/tools.js');

describe('CensaiHub Core Memory and Tool Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    embeddingsAvailable.mockReturnValue(true);
  });

  describe('Agent Retrieval', () => {
    test('getAgent retrieves agent details from database', async () => {
      const mockAgent = { id: 'atlas', name: 'Atlas', role: 'Backend' };
      pool.query.mockResolvedValueOnce({ rows: [mockAgent] });

      const agent = await getAgent('atlas');
      expect(pool.query).toHaveBeenCalledWith('SELECT * FROM agents WHERE id = $1', ['atlas']);
      expect(agent).toEqual(mockAgent);
    });

    test('getAgentsByIds returns list of matching agents', async () => {
      const mockAgents = [
        { id: 'atlas', name: 'Atlas' },
        { id: 'genesis', name: 'Genesis' }
      ];
      pool.query.mockResolvedValueOnce({ rows: mockAgents });

      const agents = await getAgentsByIds(['atlas', 'genesis']);
      expect(pool.query).toHaveBeenCalledWith('SELECT * FROM agents WHERE id = ANY($1)', [['atlas', 'genesis']]);
      expect(agents).toEqual(mockAgents);
    });
  });

  describe('Memory Storage', () => {
    test('storeMemory inserts a memory entry and returns its generated ID', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id: 'mock-memory-uuid' }] });

      const memoryId = await storeMemory('atlas', 'Nexus was right about the index', 'observation');
      
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO memories'),
        expect.arrayContaining(['atlas', 'Nexus was right about the index', 'observation'])
      );
      expect(memoryId).toBe('mock-memory-uuid');
    });

    test('storeMemory can force a memory to be compression-safe', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id: 'critical-memory-uuid' }] });

      await storeMemory('atlas', 'Plain but critical operational fact', 'fact', {
        importance: 0.1,
        emotionalWeight: 0,
        compressionSafe: true,
      });

      const insertArgs = pool.query.mock.calls[0][1];
      expect(insertArgs[10]).toBe(true);
    });
  });

  describe('Memory Recall', () => {
    test('recallMemories filters by query text when embeddings are unavailable', async () => {
      embeddingsAvailable.mockReturnValue(false);
      pool.query
        .mockResolvedValueOnce({
          rows: [{
            id: 'memory-1',
            content: 'Nexus was right about the index',
            memory_type: 'observation',
            importance: 0.7,
            emotional_weight: 0.1,
            tags: [],
            created_at: new Date(),
            entangled_with: [],
            lexical_score: 0.63,
          }],
        })
        .mockResolvedValueOnce({ rows: [] });

      const memories = await recallMemories('atlas', 'Nexus index', { limit: 5 });

      expect(memories).toHaveLength(1);
      expect(memories[0].content).toContain('Nexus');
      expect(pool.query.mock.calls[0][0]).toContain('ILIKE');
      expect(pool.query.mock.calls[0][1]).toEqual(expect.arrayContaining([
        'atlas',
        '%Nexus index%',
        '%nexus%',
        '%index%',
      ]));
    });

    test('loadAgentContext degrades when optional family-memory tables are missing', async () => {
      pool.query.mockImplementation(async (sql) => {
        if (sql === 'SELECT * FROM agents WHERE id = $1') {
          return { rows: [{ id: 'atlas', name: 'Atlas', role: 'Backend' }] };
        }
        if (String(sql).includes('agent_consciousness')) {
          const err = new Error('relation "agent_consciousness" does not exist');
          err.code = '42P01';
          throw err;
        }
        return { rows: [] };
      });

      const ctx = await loadAgentContext('atlas');

      expect(ctx.agent.id).toBe('atlas');
      expect(ctx.consciousness).toBeUndefined();
      expect(ctx.topMemories).toEqual([]);
    });
  });

  describe('Agent Tool Filtering', () => {
    test('returns whitelisted tools for a specific core agent', async () => {
      // Mock getSubAgentById returning null, and getAgent returning censai config
      pool.query.mockResolvedValueOnce({ rows: [] }); // getSubAgentById query
      pool.query.mockResolvedValueOnce({ rows: [{ id: 'censai', name: 'Censai', tool_scopes: {} }] }); // getAgent query

      // Whitelist for censai has only memory tools + web_search + project_read/list/etc.
      const tools = await filterToolsForAgent('censai');
      
      const toolNames = tools.map(t => t.function.name);
      expect(toolNames).toContain('web_search');
      expect(toolNames).toContain('remember');
      expect(toolNames).not.toContain('container_status'); // ops tool not whitelisted for censai
    });

    test('returns whitelisted tools for atlas', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] }); // getSubAgentById query

      // Atlas is now whitelisted for builder/technical tools
      const tools = await filterToolsForAgent('atlas');
      
      const toolNames = tools.map(t => t.function.name);
      expect(toolNames).not.toContain('container_status');
      expect(toolNames).toContain('run_tests');
      expect(toolNames).not.toContain('web_search');
    });
  });

  describe('Tool Execution Routing', () => {
    test('routes to executeTool and returns error if parameters are missing/incorrect', async () => {
      // Calling a tool that does not exist in registry
      const result = await executeTool('atlas', 'non_existent_tool', {});
      expect(result).toBe('Unknown tool: non_existent_tool');
    });
  });
});
