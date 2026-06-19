import { jest } from '@jest/globals';

jest.unstable_mockModule('../server/db.js', () => ({
  default: { query: jest.fn(), on: jest.fn() },
  createDbPool: jest.fn(),
}));

jest.unstable_mockModule('../server/memory/tasks.js', () => ({
  ensureAgentTaskReceiptSchema: jest.fn(async () => {}),
}));

jest.unstable_mockModule('../server/jules-task-sync/index.js', () => ({
  ensureJulesTaskSyncSchema: jest.fn(async () => {}),
}));

jest.unstable_mockModule('../server/boot/authSchema.js', () => ({
  ensureMultiUserSchema: jest.fn(async () => {}),
}));

jest.unstable_mockModule('../server/boot/capabilitySchema.js', () => ({
  ensureCapabilitySchema: jest.fn(async () => {}),
}));

jest.unstable_mockModule('../server/boot/attributeSchema.js', () => ({
  ensureAttributeSchema: jest.fn(async () => {}),
}));

jest.unstable_mockModule('../server/boot/userApiKeySchema.js', () => ({
  ensureUserApiKeySchema: jest.fn(async () => {}),
}));

jest.unstable_mockModule('../server/agent-wakeups/schema.js', () => ({
  ensureAgentWakeupSchema: jest.fn(async () => {}),
}));

jest.unstable_mockModule('../server/secrets.js', () => ({
  initSecrets: jest.fn(async () => {}),
  getSecret: jest.fn(() => ''),
}));

const noop = () => {};
jest.unstable_mockModule('../server/logger.js', () => ({
  createLogger: () => ({ info: noop, warn: noop, error: noop, debug: noop, startTimer: () => () => 0 }),
}));

jest.unstable_mockModule('../server/task-worker/claim.js', () => ({
  claimTask: jest.fn(async () => null),
}));

jest.unstable_mockModule('../server/task-worker/execution.js', () => ({
  runTask: jest.fn(async () => {}),
}));

const { default: pool } = await import('../server/db.js');
const { checkDb, recheckDb, stopDbRetry } = await import('../server/boot/database.js');
const { dbReady, setDbReady } = await import('../server/dbState.js');
const { claimTask } = await import('../server/task-worker/claim.js');
const { startTaskWorker } = await import('../server/task-worker/poll.js');
const { state: workerState } = await import('../server/task-worker/shared.js');

describe('database readiness self-healing', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    setDbReady(false);
  });

  afterEach(() => {
    stopDbRetry();
    jest.useRealTimers();
  });

  test('checkDb marks ready immediately when the database answers', async () => {
    pool.query.mockResolvedValue({ rows: [] });
    await checkDb();
    expect(dbReady()).toBe(true);
    // Watcher attaches exactly once even across repeated boots. Asserted here
    // because the attach guard is module state and this test runs first.
    await checkDb();
    expect(pool.on).toHaveBeenCalledTimes(1);
    expect(pool.on).toHaveBeenCalledWith('error', expect.any(Function));
  });

  test('checkDb failure leaves not-ready, then a background retry flips ready when the DB comes back', async () => {
    pool.query.mockRejectedValue(new Error('ECONNREFUSED 127.0.0.1:5433'));
    await checkDb();
    expect(dbReady()).toBe(false);

    // Database comes up before the first retry fires (5s after failure).
    pool.query.mockResolvedValue({ rows: [] });
    await jest.advanceTimersByTimeAsync(5000);
    expect(dbReady()).toBe(true);
  });

  test('keeps retrying through repeated failures until the DB returns', async () => {
    pool.query.mockRejectedValue(new Error('ECONNREFUSED'));
    await checkDb();

    // Burn through several failed retries (delays back off 5s → 15s cap).
    await jest.advanceTimersByTimeAsync(5000);   // attempt 1 fails
    await jest.advanceTimersByTimeAsync(10000);  // attempt 2 fails
    await jest.advanceTimersByTimeAsync(15000);  // attempt 3 fails
    expect(dbReady()).toBe(false);

    pool.query.mockResolvedValue({ rows: [] });
    await jest.advanceTimersByTimeAsync(15000);  // next attempt succeeds
    expect(dbReady()).toBe(true);
  });

  test('recheckDb drops readiness when a runtime probe fails, and recovery restores it', async () => {
    setDbReady(true);
    pool.query.mockRejectedValue(new Error('connection terminated'));
    await recheckDb('pool error');
    expect(dbReady()).toBe(false);

    pool.query.mockResolvedValue({ rows: [] });
    await jest.advanceTimersByTimeAsync(5000);
    expect(dbReady()).toBe(true);
  });

  test('recheckDb on a transient pool error keeps readiness when the probe succeeds', async () => {
    setDbReady(true);
    pool.query.mockResolvedValue({ rows: [] });
    await recheckDb('idle client error');
    expect(dbReady()).toBe(true);
  });

  test('task worker polls through a DB-down boot and activates when readiness returns', async () => {
    expect(dbReady()).toBe(false);
    startTaskWorker();
    expect(workerState.running).toBe(true);
    expect(workerState.disabledReason).toBe('database_unavailable');

    await jest.advanceTimersByTimeAsync(5000);
    expect(claimTask).not.toHaveBeenCalled();

    setDbReady(true);
    await jest.advanceTimersByTimeAsync(5000);
    expect(claimTask).toHaveBeenCalled();
    expect(workerState.disabledReason).toBeNull();
  });
});
