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
    // First call checks for existing message (none found), second inserts new
    mockPool.query
      .mockResolvedValueOnce({ rows: [] })  // idempotency check returns empty
      .mockResolvedValueOnce({ rows: [{ id: 'message-1' }] });  // insert returns new id

    const id = await sendAgentMessage('test-sender-agent', 'test-receiver-agent', 'hello', {
      priority: 'high',
      subject: 'Check in',
      messageType: 'coordination',
      importanceScore: 0.9,
      idempotencyKey: 'test-key-123',
    });

    expect(id).toBe('message-1');
    // First query should check for existing
    expect(mockPool.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('SELECT id FROM agent_messages'),
      ['test-key-123', 'test-sender-agent']
    );
    // Second query should insert
    expect(mockPool.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('INSERT INTO agent_messages'),
      expect.arrayContaining([
        'test-sender-agent',
        'test-receiver-agent',
        'hello',
      ])
    );
  });

  test('prevents duplicate messages with same idempotency key', async () => {
    // Idempotency check finds existing message
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'existing-message-id' }] });

    const id = await sendAgentMessage('test-sender-agent', 'test-receiver-agent', 'hello', {
      idempotencyKey: 'duplicate-key-456',
    });

    // Should return existing ID instead of creating new message
    expect(id).toBe('existing-message-id');
    expect(mockPool.query).toHaveBeenCalledTimes(1);  // Only check, no insert
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