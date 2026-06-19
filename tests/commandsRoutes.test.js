import { jest } from '@jest/globals';
import request from 'supertest';

const mockPool = { query: jest.fn(), connect: jest.fn() };
const createTodoItem = jest.fn();
const createWorkspaceEvent = jest.fn();
const getUserState = jest.fn();
const setUserState = jest.fn();

jest.unstable_mockModule('../server/db.js', () => ({ default: mockPool }));
jest.unstable_mockModule('../server/operational-intelligence/todos.js', () => ({
  createTodoItem,
}));
jest.unstable_mockModule('../server/operational-intelligence/factories.js', () => ({
  createWorkspaceEvent,
}));
jest.unstable_mockModule('../server/state/clientStateStore.js', () => ({
  WORKSPACE_STATE_KEY: 'homebase.workspace.v1',
  getUserState,
  setUserState,
}));

const envSnapshot = { ...process.env };
const { default: express } = await import('express');
const { commandsRouter } = await import('../server/routes/commands.js');

function createApp(session = { userId: 7 }) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.session = session;
    next();
  });
  app.use('/api', commandsRouter);
  return app;
}

describe('commands routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...envSnapshot };
    process.env.HOMEBASE_MODE = 'private_server';
  });

  afterAll(() => {
    process.env = envSnapshot;
  });

  test('lists command metadata', async () => {
    const response = await request(createApp()).get('/api/commands');

    expect(response.status).toBe(200);
    expect(response.body.commands.map(command => command.id)).toEqual(expect.arrayContaining([
      'workspace.state.read',
      'workspace.state.write',
      'window.import.validate',
      'artifact.search',
      'operational.todo.create',
    ]));
  });

  test('executes workspace state reads with request-derived context and audit emission', async () => {
    getUserState.mockResolvedValue({
      found: true,
      source: 'database',
      value: { wins: [{ id: 'w-1' }] },
    });
    createWorkspaceEvent.mockResolvedValue({ id: 'event-1' });

    const response = await request(createApp())
      .post('/api/commands/workspace.state.read/execute')
      .send({ workspaceId: 'workspace-1' });

    expect(response.status).toBe(200);
    expect(getUserState).toHaveBeenCalledWith({
      db: mockPool,
      userId: '7',
      key: 'homebase.workspace.v1',
    });
    expect(createWorkspaceEvent).toHaveBeenCalledWith({ db: mockPool }, expect.objectContaining({
      workspaceId: 'workspace-1',
      type: 'command.executed',
      actor: { kind: 'user', id: '7' },
    }));
    expect(response.body.context).toEqual({
      userId: '7',
      workspaceId: 'workspace-1',
      actor: { kind: 'user', id: '7' },
      runtimeMode: 'private_server',
    });
    expect(response.body.result).toEqual({
      key: 'homebase.workspace.v1',
      workspaceId: 'workspace-1',
      storageScope: 'user',
      found: true,
      value: { wins: [{ id: 'w-1' }] },
    });
    expect(response.body.auditEventId).toBe('event-1');
  });

  test('executes operational todo creation with actor and workspace context', async () => {
    createTodoItem.mockResolvedValue({
      list: { id: 'list-1', title: 'Plan' },
      items: [{ id: 'task-1', text: 'Ship it' }],
    });
    createWorkspaceEvent.mockResolvedValue({ id: 'event-2' });

    const response = await request(createApp())
      .post('/api/commands/operational.todo.create/execute')
      .send({
        workspaceId: 'workspace-1',
        listArtifactId: 'list-1',
        item: { text: 'Ship it' },
        order: 3,
      });

    expect(response.status).toBe(200);
    expect(createTodoItem).toHaveBeenCalledWith(mockPool, {
      workspaceId: 'workspace-1',
      actor: { kind: 'user', id: '7' },
      listArtifactId: 'list-1',
      item: { text: 'Ship it' },
      order: 3,
    });
    expect(response.body.result.items).toHaveLength(1);
  });

  test('returns blocked import patterns from validate command without writing files', async () => {
    const response = await request(createApp())
      .post('/api/commands/window.import.validate/execute')
      .send({
        workspaceId: 'workspace-1',
        label: 'Danger Window',
        rawJsx: "const output = eval('2 + 2'); import('https://example.com/tool.js');",
      });

    expect(response.status).toBe(200);
    expect(response.body.result.ok).toBe(false);
    expect(response.body.result.componentName).toBe('DangerWindowWindow');
    expect(response.body.result.issues.map(issue => issue.code)).toEqual([
      'eval',
      'import-http',
    ]);
  });

  test('fails command execution when workspace context is missing and records a failed audit when possible', async () => {
    createWorkspaceEvent.mockResolvedValue({ id: 'event-3' });

    const response = await request(createApp())
      .post('/api/commands/workspace.state.write/execute')
      .send({ value: { wins: [] } });

    expect(response.status).toBe(400);
    expect(setUserState).not.toHaveBeenCalled();
    expect(response.body.error).toBe('workspaceId is required');
    expect(response.body.auditEventId).toBeNull();
  });
});
