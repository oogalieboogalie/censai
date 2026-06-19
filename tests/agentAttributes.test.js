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

// Mock tools to avoid loading execution loops
jest.unstable_mockModule('../server/tools.js', () => ({
  listToolCatalog: jest.fn(() => ({ tools: [], categories: [] })),
  filterToolsForAgent: jest.fn().mockResolvedValue([]),
}));

// Import compiler and router after mocks are registered
const { compilePromptTemplate } = await import('../server/memory/promptCompiler.js');
const { coreRouter } = await import('../server/routes/agents/core.js');
const { attributesRouter } = await import('../server/routes/agents/attributes.js');

describe('Persona Attributes Compiler & API', () => {
  let app;

  beforeAll(async () => {
    const express = (await import('express')).default;
    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.session = { userId: 1 };
      next();
    });
    app.use('/api', coreRouter);
    app.use('/api', attributesRouter);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPool.query.mockReset();
    mockClient.query.mockReset();
  });

  describe('Prompt Compilation Logic', () => {
    test('compiles template placeholders with equipped attributes', () => {
      const template = "You are {{ a very $meticulous and $friendly }} design lead.";
      const equipped = {
        meticulous: "detail-oriented",
        friendly: "warm",
      };

      const result = compilePromptTemplate(template, equipped);
      expect(result).toBe("You are a very detail-oriented and warm design lead.");
    });

    test('collapses block completely when no attributes inside are equipped', () => {
      const template = "You are {{ a very $meticulous and $friendly }} design lead.";
      const equipped = {};

      const result = compilePromptTemplate(template, equipped);
      expect(result).toBe("You are design lead.");
    });

    test('joins only equipped attributes when some are missing', () => {
      const template = "You are {{ a very $meticulous and $friendly }} design lead.";
      const equipped = {
        meticulous: "detail-oriented",
      };

      const result = compilePromptTemplate(template, equipped);
      expect(result).toBe("You are a very detail-oriented design lead.");
    });

    test('performs natural list joining for three or more attributes', () => {
      const template = "You are {{ a very $meticulous, $friendly, and $creative }} designer.";
      const equipped = {
        meticulous: "detail-oriented",
        friendly: "warm",
        creative: "inventive",
      };

      const result = compilePromptTemplate(template, equipped);
      expect(result).toBe("You are a very detail-oriented, warm, and inventive designer.");
    });
  });

  describe('Attributes API Endpoints', () => {
    test('GET /api/attributes returns seeded attributes', async () => {
      const mockAttrs = [
        { id: 'meticulous', name: 'Meticulous', description: 'desc', value: 'val' }
      ];
      mockPool.query.mockResolvedValueOnce({ rows: mockAttrs });

      const response = await request(app).get('/api/attributes');
      expect(response.status).toBe(200);
      expect(response.body.attributes).toEqual(mockAttrs);
    });

    test('GET /api/agents/:id/attributes returns equipped attribute IDs', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ attribute_id: 'meticulous' }, { attribute_id: 'friendly' }]
      });

      const response = await request(app).get('/api/agents/censai/attributes');
      expect(response.status).toBe(200);
      expect(response.body.attributes).toEqual(['meticulous', 'friendly']);
    });

    test('PUT /api/agents/:id/attributes updates agent attributes in a transaction', async () => {
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // DELETE
        .mockResolvedValueOnce({}) // INSERT
        .mockResolvedValueOnce({}); // COMMIT

      const response = await request(app)
        .put('/api/agents/censai/attributes')
        .send({ attributes: ['meticulous'] });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ ok: true });
      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
      expect(mockClient.query).toHaveBeenNthCalledWith(2, 'DELETE FROM agent_attributes WHERE agent_id = $1', ['censai']);
      expect(mockClient.query).toHaveBeenNthCalledWith(3, 'INSERT INTO agent_attributes (agent_id, attribute_id) VALUES ($1, $2)', ['censai', 'meticulous']);
      expect(mockClient.query).toHaveBeenNthCalledWith(4, 'COMMIT');
    });

    test('POST /api/agents/:id/compile-prompt-preview returns compiled template preview', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'meticulous', value: 'detail-oriented' }]
      });

      const response = await request(app)
        .post('/api/agents/censai/compile-prompt-preview')
        .send({
          template: "You are {{ very $meticulous }}.",
          attributes: ['meticulous']
        });

      expect(response.status).toBe(200);
      expect(response.body.compiled).toBe("You are very detail-oriented.");
    });
  });
});
