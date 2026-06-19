import pool from '../../db.js';
import { getUserState, setUserState, WORKSPACE_STATE_KEY } from '../../state/clientStateStore.js';

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
      const result = await getUserState({ db: pool, userId: context.userId, key });
      return {
        key,
        workspaceId: context.workspaceId,
        storageScope: 'user',
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
      await setUserState({ db: pool, userId: context.userId, key, value: input.value ?? null });
      return {
        ok: true,
        key,
        workspaceId: context.workspaceId,
        storageScope: 'user',
      };
    },
  },
];
