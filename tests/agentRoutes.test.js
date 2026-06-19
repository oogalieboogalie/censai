import { jest } from '@jest/globals';
import request from 'supertest';

jest.unstable_mockModule('../server/dbState.js', () => ({
  dbReady: () => true,
  setDbReady: jest.fn(),
}));

jest.unstable_mockModule('../server/memory.js', () => ({
  getAgents: jest.fn().mockResolvedValue([{ id: 'atlas', name: 'Atlas' }]),
  getAgent: jest.fn().mockResolvedValue({ id: 'atlas', name: 'Atlas' }),
  upsertAgent: jest.fn(async (agent) => agent),
}));

jest.unstable_mockModule('../server/tools.js', () => ({
  listToolCatalog: jest.fn(() => ({ tools: [], categories: [] })),
  filterToolsForAgent: jest.fn().mockResolvedValue([]),
}));

const { coreRouter } = await import('../server/routes/agents/core.js');

describe('split agent routes', () => {
  let app;

  beforeAll(async () => {
    const express = (await import('express')).default;
    app = express();
    app.use(express.json());
    app.use('/api', coreRouter);
  });

  test('GET /api/agents is served by the split core router', async () => {
    const response = await request(app).get('/api/agents');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: 'atlas', name: 'Atlas' }]);
  });

  test('PUT /api/agents/:id uses the mounted path without duplicate /api', async () => {
    const response = await request(app)
      .put('/api/agents/atlas')
      .send({ name: 'Atlas Prime' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: 'atlas', name: 'Atlas Prime' });
  });

  test('duplicate /api/api/agents/:id route is not registered', async () => {
    const response = await request(app)
      .put('/api/api/agents/atlas')
      .send({ name: 'Wrong Path' });

    expect(response.status).toBe(404);
  });
});
