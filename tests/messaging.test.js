import { jest } from '@jest/globals';

const mockPool = {
  query: jest.fn(),
  connect: jest.fn(),
  on: jest.fn(),
  end: jest.fn(),
  ended: false,
};

jest.unstable_mockModule('../server/db.js', () => ({
  default: mockPool,
  createDbPool: () => mockPool,
}));

jest.unstable_mockModule('../server/embeddings.js', () => ({
  embed: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
  embeddingsAvailable: jest.fn().mockReturnValue(true),
}));

jest.unstable_mockModule('../server/qdrant.js', () => ({
  upsertVector: jest.fn().mockResolvedValue(true),
  searchVectors: jest.fn().mockResolvedValue([]),
}));

const {
  sendAgentMessage,
  getAgentMessages,
  markMessageRead,
} = await import('../server/memory/core.js');

describe('Agent Messaging System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('stores an agent-to-agent message through the memory layer', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'message-1' }] });

    const id = await sendAgentMessage('test-sender-agent', 'test-receiver-agent', 'hello', {
      priority: 'high',
      subject: 'Check in',
      messageType: 'coordination',
      importanceScore: 0.9,
    });

    expect(id).toBe('message-1');
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO agent_messages'),
      [
        'test-sender-agent',
        'test-receiver-agent',
        'hello',
        'high',
        null,
        'Check in',
        'coordination',
        0.9,
        false,
        true,
      ],
    );
  });

  test('reads unread messages for an agent', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [{ id: 'message-1', from_agent: 'atlas', to_agent: 'censai', content: 'ping' }],
    });

    const messages = await getAgentMessages('censai', true);

    expect(messages).toHaveLength(1);
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('am.read_at IS NULL'),
      ['censai'],
    );
  });

  test('marks a message as read', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    await markMessageRead('message-1');

    expect(mockPool.query).toHaveBeenCalledWith(
      'UPDATE agent_messages SET read_at = NOW() WHERE id = $1',
      ['message-1'],
    );
  });
});
