import pool from '../../db.js';
import { getWorkspaceState, setWorkspaceState, WORKSPACE_STATE_KEY } from '../../state/clientStateStore.js';
import { requireWorkspaceMember } from '../../workspaces/context.js';

function requireWorkspaceContext(context) {
  if (!context.workspaceId) throw new Error('workspaceId is required');
}

export const workspaceCommands = [
  {
    id: 'workspace.state.read',
    title: 'Read workspace state',
    description: 'Reads the current workspace canvas payload from the persisted client-state store.',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string', default: WORKSPACE_STATE_KEY },
      },
    },
    outputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string' },
        workspaceId: { type: 'string' },
        storageScope: { type: 'string' },
        found: { type: 'boolean' },
        value: {},
      },
    },
    requiredCapabilities: ['workspace.read'],
    sideEffects: [],
    async handler({ context, input }) {
      requireWorkspaceContext(context);
      const key = input.key || WORKSPACE_STATE_KEY;
      await requireWorkspaceMember(pool, {
        userId: context.userId,
        workspaceId: context.workspaceId,
      });
      const result = await getWorkspaceState({ db: pool, workspaceId: context.workspaceId, key });
      return {
        key,
        workspaceId: context.workspaceId,
        storageScope: 'workspace',
        found: result.found,
        value: result.value,
      };
    },
  },
  {
    id: 'workspace.state.write',
    title: 'Write workspace state',
    description: 'Writes the current workspace canvas payload into the persisted client-state store.',
    inputSchema: {
      type: 'object',
      required: ['value'],
      properties: {
        key: { type: 'string', default: WORKSPACE_STATE_KEY },
        value: {},
      },
    },
    outputSchema: {
      type: 'object',
      properties: {
        ok: { type: 'boolean' },
        key: { type: 'string' },
        workspaceId: { type: 'string' },
        storageScope: { type: 'string' },
      },
    },
    requiredCapabilities: ['workspace.write'],
    sideEffects: ['state.write'],
    async handler({ context, input }) {
      requireWorkspaceContext(context);
      const key = input.key || WORKSPACE_STATE_KEY;
      await requireWorkspaceMember(pool, {
        userId: context.userId,
        workspaceId: context.workspaceId,
        roles: ['owner', 'admin', 'member'],
      });
      await setWorkspaceState({
        db: pool,
        workspaceId: context.workspaceId,
        key,
        value: input.value ?? null,
      });
      return {
        ok: true,
        key,
        workspaceId: context.workspaceId,
        storageScope: 'workspace',
      };
    },
  },
];
