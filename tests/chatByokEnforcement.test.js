import { jest } from '@jest/globals';

const getAgent = jest.fn();
const getUserApiKeyConfig = jest.fn();
const resolveChatModelConfig = jest.fn();

jest.unstable_mockModule('../server/dbState.js', () => ({
  dbReady: () => true,
}));

jest.unstable_mockModule('../server/workspaces.js', () => ({
  openProject: jest.fn(),
}));

jest.unstable_mockModule('../server/memory.js', () => ({
  getAgent,
  getSubAgentById: jest.fn().mockResolvedValue(null),
  buildSystemPrompt: jest.fn().mockResolvedValue('agent prompt'),
}));

jest.unstable_mockModule('../server/aiGateway/index.js', () => ({
  resolveChatModelConfig,
}));

jest.unstable_mockModule('../server/tools.js', () => ({
  filterToolsForAgent: jest.fn().mockResolvedValue([]),
}));

jest.unstable_mockModule('../server/db.js', () => ({
  default: { query: jest.fn() },
}));

jest.unstable_mockModule('../server/security/userApiKeys.js', () => ({
  getUserApiKeyConfig,
  inferUserApiKeyProvider: jest.fn((provider, baseUrl) => (
    provider || (baseUrl.includes('openrouter.ai') ? 'openrouter' : null)
  )),
}));

jest.unstable_mockModule('../server/routes/chat/prompts.js', () => ({
  buildSubAgentSystemPrompt: jest.fn(),
}));

const { prepareChatContext } = await import('../server/routes/chat/chatContext.js');
const originalMode = process.env.HOMEBASE_MODE;

describe('chat BYOK enforcement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.HOMEBASE_MODE = 'cloud_saas';
    resolveChatModelConfig.mockReturnValue({
      provider: 'openrouter',
      model: 'anthropic/claude-sonnet-4.5',
      baseUrl: 'https://openrouter.ai/api/v1',
      apiKey: 'server-paid-key',
    });
    getAgent.mockResolvedValue({
      id: 'censai',
      model_provider: 'openrouter',
      model_name: 'anthropic/claude-sonnet-4.5',
    });
  });

  afterAll(() => {
    if (originalMode === undefined) delete process.env.HOMEBASE_MODE;
    else process.env.HOMEBASE_MODE = originalMode;
  });

  test('blocks a non-admin paid cloud model without a personal key', async () => {
    getUserApiKeyConfig.mockResolvedValue(null);

    await expect(prepareChatContext(
      'censai',
      null,
      [{ from: 'me', text: 'hello' }],
      7,
      'user'
    )).rejects.toThrow('requires a personal API key');
  });

  test('uses the matching personal key and optional overrides', async () => {
    getUserApiKeyConfig.mockResolvedValue({
      apiKey: 'personal-key',
      modelName: 'openai/gpt-4.1',
    });

    const context = await prepareChatContext(
      'censai',
      null,
      [{ from: 'me', text: 'hello' }],
      7,
      'user'
    );

    expect(getUserApiKeyConfig).toHaveBeenCalledWith(7, 'openrouter');
    expect(context).toMatchObject({
      reqApiKey: 'personal-key',
      reqBaseUrl: 'https://openrouter.ai/api/v1',
      reqModel: 'openai/gpt-4.1',
    });
  });

  test('infers the credential provider for seeded agents without one', async () => {
    getAgent.mockResolvedValue({
      id: 'censai',
      model_provider: null,
      model_name: 'anthropic/claude-sonnet-4.5',
    });
    resolveChatModelConfig.mockReturnValue({
      provider: null,
      model: 'anthropic/claude-sonnet-4.5',
      baseUrl: 'https://openrouter.ai/api/v1',
      apiKey: 'server-paid-key',
    });
    getUserApiKeyConfig.mockResolvedValue({
      apiKey: 'personal-key',
      modelName: null,
    });

    const context = await prepareChatContext(
      'censai',
      null,
      [{ from: 'me', text: 'hello' }],
      7,
      'user'
    );

    expect(getUserApiKeyConfig).toHaveBeenCalledWith(7, 'openrouter');
    expect(context.reqApiKey).toBe('personal-key');
  });

  test('fails closed when personal-key verification errors', async () => {
    getUserApiKeyConfig.mockRejectedValue(new Error('database offline'));

    await expect(prepareChatContext(
      'censai',
      null,
      [{ from: 'me', text: 'hello' }],
      7,
      'user'
    )).rejects.toThrow('Unable to verify a personal API key');
  });

  test('uses the server-managed provider route in local mode', async () => {
    process.env.HOMEBASE_MODE = 'local_desktop';
    getUserApiKeyConfig.mockResolvedValue(null);

    const context = await prepareChatContext(
      'censai',
      null,
      [{ from: 'me', text: 'hello' }],
      7,
      'user'
    );

    expect(getUserApiKeyConfig).not.toHaveBeenCalled();
    expect(context.reqApiKey).toBe('server-paid-key');
  });
});
