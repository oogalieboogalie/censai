import { jest } from '@jest/globals';
import {
  getWorkspaceState,
  setWorkspaceState,
} from '../server/state/clientStateStore.js';
import {
  requireWorkspaceMember,
  resolveWorkspaceContext,
} from '../server/workspaces/context.js';

describe('workspace-scoped client state', () => {
  test('reads and writes canvas state by workspace id', async () => {
    const db = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ value: { wins: [] } }] })
        .mockResolvedValueOnce({ rows: [] }),
    };

    await expect(getWorkspaceState({
      db,
      workspaceId: 'workspace-1',
    })).resolves.toEqual(expect.objectContaining({
      found: true,
      value: { wins: [] },
    }));
    await setWorkspaceState({
      db,
      workspaceId: 'workspace-1',
      value: { wins: [{ id: 'window-1' }] },
    });

    expect(db.query.mock.calls[0][1]).toEqual([
      'workspace-1',
      'homebase.workspace.v1',
    ]);
    expect(db.query.mock.calls[1][1][0]).toBe('workspace-1');
  });

  test('rejects users who are not workspace members', async () => {
    const db = { query: jest.fn().mockResolvedValue({ rows: [] }) };

    await expect(requireWorkspaceMember(db, {
      userId: 7,
      workspaceId: 'workspace-1',
    })).rejects.toMatchObject({
      message: 'Workspace access denied',
      statusCode: 403,
    });
  });

  test('creates an owned workspace only when the id does not exist', async () => {
    const db = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 'workspace-1' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{ id: 'workspace-1', name: 'Workspace', role: 'owner' }],
        }),
    };

    await expect(resolveWorkspaceContext(db, {
      userId: 7,
      workspaceId: 'workspace-1',
      createIfMissing: true,
    })).resolves.toEqual(expect.objectContaining({
      id: 'workspace-1',
      role: 'owner',
    }));
  });

  test('does not let a non-member claim an existing workspace', async () => {
    const db = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ id: 'workspace-1' }] })
        .mockResolvedValueOnce({ rows: [] }),
    };

    await expect(resolveWorkspaceContext(db, {
      userId: 7,
      workspaceId: 'workspace-1',
      createIfMissing: true,
    })).rejects.toMatchObject({ statusCode: 403 });
    expect(db.query).toHaveBeenCalledTimes(2);
  });

  test('resolveWorkspaceContext surfaces tenantId from a workspace row with tenant_id set', async () => {
    const db = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ id: 'workspace-1', tenant_id: 'acme' }] })
        .mockResolvedValueOnce({
          rows: [{ id: 'workspace-1', name: 'Workspace', role: 'owner' }],
        }),
    };

    await expect(resolveWorkspaceContext(db, {
      userId: 7,
      workspaceId: 'workspace-1',
    })).resolves.toEqual({
      id: 'workspace-1',
      name: 'Workspace',
      role: 'owner',
      tenantId: 'acme',
    });
  });

  test('resolveWorkspaceContext defaults tenantId to null when the column is null', async () => {
    const db = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ id: 'workspace-1', tenant_id: null }] })
        .mockResolvedValueOnce({
          rows: [{ id: 'workspace-1', name: 'Workspace', role: 'owner' }],
        }),
    };

    await expect(resolveWorkspaceContext(db, {
      userId: 7,
      workspaceId: 'workspace-1',
    })).resolves.toEqual(expect.objectContaining({
      id: 'workspace-1',
      role: 'owner',
      tenantId: null,
    }));
  });
});
