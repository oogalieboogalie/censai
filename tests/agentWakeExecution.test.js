import { jest } from '@jest/globals';

const getAgent = jest.fn();
const buildSystemPrompt = jest.fn();
const markMessageRead = jest.fn();
const sendAgentMessage = jest.fn();
const loadWakeupContext = jest.fn();
const getWakeupTasks = jest.fn();
const updateWakeup = jest.fn();
const runWakeModel = jest.fn();

jest.unstable_mockModule('../server/memory.js', () => ({
  getAgent,
  buildSystemPrompt,
  markMessageRead,
  sendAgentMessage,
}));
jest.unstable_mockModule('../server/agent-wakeups/store.js', () => ({
  loadWakeupContext,
  getWakeupTasks,
  updateWakeup,
}));
jest.unstable_mockModule('../server/agent-wakeups/modelLoop.js', () => ({
  runWakeModel,
}));

const { runAgentWakeup } = await import('../server/agent-wakeups/execution.js');

const baseWake = {
  id: 'wake-1',
  message_id: 'message-1',
  agent_id: 'atlas',
  sender_id: 'architect',
  sender_name: 'The Architect',
  message_type: 'agent-to-agent',
  content: 'Implement the backend.',
  subject: 'Backend',
  phase: 'initial',
};

describe('agent wake execution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    loadWakeupContext.mockResolvedValue({ ...baseWake });
    getAgent.mockResolvedValue({ id: 'atlas', name: 'Atlas' });
    buildSystemPrompt.mockResolvedValue('Atlas system prompt');
    runWakeModel.mockResolvedValue({ text: 'I delegated the work.', toolCalls: ['dispatch_squad'] });
  });

  test('acknowledges once and waits when child tasks are active', async () => {
    getWakeupTasks
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'task-1', status: 'in_progress' }]);

    await runAgentWakeup({ id: 'wake-1' });

    expect(sendAgentMessage).toHaveBeenCalledWith(
      'atlas', 'architect', expect.stringContaining('acknowledged'),
      expect.objectContaining({ messageType: 'agent_ack', wake: false })
    );
    expect(updateWakeup).toHaveBeenCalledWith('wake-1',
      expect.objectContaining({ status: 'waiting_children', phase: 'review' }));
  });

  test('reviews terminal work and wakes the sender with a final report', async () => {
    loadWakeupContext.mockResolvedValue({ ...baseWake, phase: 'review' });
    getWakeupTasks.mockResolvedValue([
      { id: 'task-1', title: 'API work', status: 'completed', result: 'Green.' },
    ]);
    runWakeModel.mockResolvedValue({ text: 'Backend is verified and green.', toolCalls: [] });

    await runAgentWakeup({ id: 'wake-1' });

    expect(sendAgentMessage).toHaveBeenCalledWith(
      'atlas', 'architect', 'Backend is verified and green.',
      expect.objectContaining({ messageType: 'agent_report', wake: true })
    );
    expect(updateWakeup).toHaveBeenCalledWith('wake-1',
      expect.objectContaining({ status: 'completed' }));
  });

  test('does not create acknowledgement loops for informational reports', async () => {
    loadWakeupContext.mockResolvedValue({
      ...baseWake,
      message_type: 'agent_report',
      content: 'Backend is complete.',
    });
    getWakeupTasks.mockResolvedValue([]);
    runWakeModel.mockResolvedValue({ text: 'No further action needed.', toolCalls: [] });

    await runAgentWakeup({ id: 'wake-1' });

    expect(sendAgentMessage).not.toHaveBeenCalled();
    expect(updateWakeup).toHaveBeenCalledWith('wake-1',
      expect.objectContaining({ status: 'completed' }));
  });
});
