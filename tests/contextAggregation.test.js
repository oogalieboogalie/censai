import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Mock DB
jest.unstable_mockModule('../server/db.js', () => ({
  default: {
    query: jest.fn()
  }
}));

// Mock Prioritization
jest.unstable_mockModule('../server/operational-intelligence/prioritization.js', () => ({
  prioritizeArtifacts: jest.fn(async (a) => a)
}));

// Mock Schema
jest.unstable_mockModule('../server/operational-intelligence/schema.js', () => ({
  ensureOperationalIntelligenceSchema: jest.fn()
}));

const { default: pool } = await import('../server/db.js');
const { contextRouter } = await import('../server/routes/context.js');

const app = express();
app.use(express.json());
app.use('/api', contextRouter);

describe('Context Aggregator API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /api/context/feed returns prioritized artifacts', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        { id: '1', artifact_type: 'notification', title: 'Test 1', data: {}, updated_at: new Date() }
      ]
    });

    const res = await request(app).get('/api/context/feed?workspaceId=default');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Test 1');
  });

  test('GET /api/context/search returns search results', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        { id: '2', artifact_type: 'external_task', title: 'Find Me', data: {}, rank: 0.9 }
      ]
    });

    const res = await request(app).get('/api/context/search?workspaceId=default&q=Find');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Find Me');
  });

  test('GET /api/context/feed requires workspaceId', async () => {
    const res = await request(app).get('/api/context/feed');
    expect(res.status).toBe(400);
  });
});
