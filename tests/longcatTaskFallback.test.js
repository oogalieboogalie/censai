import { jest } from '@jest/globals';

const updateAgentTask = jest.fn(async () => ({}));
const executeTool = jest.fn(async () => 'edited');
const callModel = jest.fn();

jest.unstable_mockModule('../server/memory.js', () => ({
  updateAgentTask,
  getSubAgentById: jest.fn(async () => ({ id: 'sub1', name: 'worker' })),
  sendAgentMessage: jest.fn(async () => {}),
  buildCompletionReceipt: jest.fn(() => ({ status: 'completed' })),
}));

jest.unstable_mockModule('../server/routes/chat/index.js', () => ({
  buildSubAgentSystemPrompt: jest.fn(async () => 'system'),
  getSubAgentModelConfig: jest.fn(() => ({
    modelName: 'longcat',
    baseUrl: 'http://stub',
    apiKey: 'key',
    modelProvider: 'openai-compatible',
  })),
}));

jest.unstable_mockModule('../server/aiGateway/index.js', () => ({ callModel }));
jest.unstable_mockModule('../server/tools.js', () => ({
  executeTool,
  filterToolsForAgent: jest.fn(async () => []),
}));
jest.unstable_mockModule('../server/task-worker/batch.js', () => ({
  checkBatchCompletion: jest.fn(async () => {}),
}));

const { runTask } = await import('../server/task-worker/execution.js');

test('task worker executes a longcat text tool call', async () => {
  callModel
    .mockResolvedValueOnce({
      choices: [{
        message: {
          role: 'assistant',
          content: [
            '<longcattoolcall>project_edit',
            '<longcatargkey>path</longcatargkey>',
            '<longcatargvalue>README.md</longcatargvalue>',
            '</longcattoolcall>',
          ].join('\n'),
        },
      }],
    })
    .mockResolvedValueOnce({
      choices: [{ message: { role: 'assistant', content: '## Summary\nDone' } }],
    });

  await runTask({
    id: 'task1',
    assignee_id: 'sub1',
    title: 'Edit file',
    prompt: 'edit it',
    priority: 'normal',
  });

  expect(executeTool).toHaveBeenCalledWith(
    'sub1',
    'project_edit',
    { path: 'README.md' },
    { agentTaskId: 'task1' },
  );
  expect(updateAgentTask).toHaveBeenCalledWith(
    'task1',
    expect.objectContaining({ status: 'completed', result: '## Summary\nDone' }),
  );
});
