import { jest } from '@jest/globals';
import request from 'supertest';

// Mocking Qdrant and Model Provider env/secrets
jest.unstable_mockModule('../server/qdrant.js', () => ({
  checkQdrantHealth: jest.fn(async () => ({ ready: true, connected: true })),
  upsertVector: jest.fn(),
  searchVectors: jest.fn(),
  deleteVector: jest.fn(),
}));

jest.unstable_mockModule('../server/secrets.js', () => ({
  initSecrets: jest.fn(),
  getSecret: jest.fn((key) => {
    if (key === 'AI_API_KEY') return 'test-key';
    return null;
  }),
}));

const { app } = await import('../server.js');
const { default: pool } = await import('../server/db.js');

describe('Readiness and Health API', () => {
  let querySpy;

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock for DB success
    querySpy = jest.spyOn(pool, 'query').mockResolvedValue({ rows: [] });
  });

  afterEach(() => {
    querySpy.mockRestore();
  });

  it('GET /api/health returns 200 and legacy format', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ok', true);
    expect(res.body).toHaveProperty('database', true);
    expect(res.body).toHaveProperty('modelProvider');
    expect(res.body.modelProvider).toHaveProperty('ready', true);
  });

  it('GET /api/ready returns 200 when all critical systems are up', async () => {
    const res = await request(app).get('/api/ready');
    expect(res.status).toBe(200);
    expect(res.body.ready).toBe(true);
  });

  it('GET /api/ready returns 503 when database is down', async () => {
    querySpy.mockRejectedValueOnce(new Error('DB Down'));
    const res = await request(app).get('/api/ready');
    expect(res.status).toBe(503);
    expect(res.body.ready).toBe(false);
    expect(res.body.database.connected).toBe(false);
  });

  it('GET /api/ready returns 200 even if Qdrant is down (optional)', async () => {
    const { checkQdrantHealth } = await import('../server/qdrant.js');
    checkQdrantHealth.mockResolvedValueOnce({ ready: false, connected: false, error: 'Connection refused' });

    const res = await request(app).get('/api/ready');
    expect(res.status).toBe(200); // Still 200 because Qdrant is optional
    expect(res.body.qdrant.ready).toBe(false);
    expect(res.body.ready).toBe(true); // App is still "ready" for core tasks
  });
});
