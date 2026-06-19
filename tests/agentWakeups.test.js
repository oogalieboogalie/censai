import { jest } from '@jest/globals';

const query = jest.fn();

jest.unstable_mockModule('../server/db.js', () => ({
  default: { query },
}));

const {
  claimAgentWakeup,
  enqueueAgentWakeup,
  shouldWakeForMessage,
} = await import('../server/agent-wakeups/store.js');
const { buildWakePrompt } = await import('../server/agent-wakeups/prompt.js');

describe('agent wakeup protocol', () => {
  beforeEach(() => query.mockReset());

  test('wakes direct work and report messages without waking acknowledgements or self-messages', () => {
    expect(shouldWakeForMessage('architect', 'atlas', { messageType: 'agent-to-agent' })).toBe(true);
    expect(shouldWakeForMessage('atlas', 'architect', { messageType: 'agent_report' })).toBe(true);
    expect(shouldWakeForMessage('atlas', 'architect', { messageType: 'agent_ack' })).toBe(false);
    expect(shouldWakeForMessage('atlas', 'atlas', { messageType: 'agent-to-agent' })).toBe(false);
    expect(shouldWakeForMessage('architect', 'atlas', { messageType: 'agent-to-agent', wake: false })).toBe(false);
  });

  test('enqueues idempotently by source message', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 'wake-1' }] });
    await expect(enqueueAgentWakeup('message-1', 'atlas', 'architect'))
      .resolves.toEqual({ id: 'wake-1' });
    expect(query.mock.calls[0][0]).toContain('ON CONFLICT(message_id)');
    expect(query.mock.calls[0][1]).toEqual(['message-1', 'atlas', 'architect']);
  });

  test('requeues waiting coordinators only after linked child work is terminal', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    await claimAgentWakeup();
    expect(query.mock.calls[0][0]).toContain("aw.status='waiting_children'");
    expect(query.mock.calls[0][0]).toContain("t.status IN ('queued','in_progress','blocked')");
  });

  test('review prompt includes child results and requires critical review', () => {
    const prompt = buildWakePrompt({
      sender_name: 'The Architect',
      sender_id: 'architect',
      message_id: 'message-1',
      message_type: 'agent-to-agent',
      content: 'Build the backend.',
      phase: 'review',
    }, [{ title: 'API work', status: 'completed', result: 'Tests pass.' }]);
    expect(prompt).toContain('Delegated work to review');
    expect(prompt).toContain('Tests pass.');
    expect(prompt).toContain('Review the results critically');
  });
});
