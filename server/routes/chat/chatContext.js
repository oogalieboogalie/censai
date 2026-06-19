import { dbReady } from '../../dbState.js';
import { openProject } from '../../workspaces.js';
import { getAgent, getSubAgentById, buildSystemPrompt } from '../../memory.js';
import { resolveChatModelConfig } from '../../aiGateway/index.js';
import { filterToolsForAgent } from '../../tools.js';
import { buildSubAgentSystemPrompt } from './prompts.js';
import pool from '../../db.js';
import {
  getUserApiKeyConfig,
  inferUserApiKeyProvider,
} from '../../security/userApiKeys.js';
import { requiresPersonalApiKey } from '../../security/byokPolicy.js';
import {
  analyzeChangeImpact,
  formatChangeImpactForPrompt,
} from '../../semantic/changeImpact.js';

export async function prepareChatContext(agentId, currentProject, messages, userId = null, userRole = null) {
  let modelConfig = resolveChatModelConfig();
  let reqModel = modelConfig.model;
  let reqBaseUrl = modelConfig.baseUrl;
  let reqApiKey = modelConfig.apiKey;
  let provider = modelConfig.provider;
  let systemPrompt = 'You are a helpful assistant.';
  const lastUserMsg = messages?.filter(m => m.from === 'me').pop()?.text;
  const changeImpact = analyzeChangeImpact(lastUserMsg, { project: currentProject });
  let ensuredProject = null;

  let effectiveRole = userRole;
  if (userId && !effectiveRole && dbReady()) {
    const userRes = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
    effectiveRole = userRes.rows[0]?.role || 'user';
  }

  if (dbReady() && agentId) {
    try {
      if (currentProject?.type === 'local' && currentProject.path) {
        ensuredProject = await openProject(agentId, {
          name: currentProject.name,
          existingPath: currentProject.path,
          summary: currentProject.scopeLabel
            ? `Canvas group scoped project: ${currentProject.scopeLabel}`
            : 'Canvas scoped project',
        });
      }

      const agent = await getAgent(agentId, userId);

      if (agent) {
        modelConfig = resolveChatModelConfig({
          modelProvider: agent.model_provider,
          modelName: agent.model_name,
        });
        provider = agent.model_provider || modelConfig.provider;
        reqModel = modelConfig.model;
        reqBaseUrl = modelConfig.baseUrl;
        reqApiKey = modelConfig.apiKey;
      } else {
        const sub = await getSubAgentById(agentId);
        if (sub) {
          modelConfig = resolveChatModelConfig({
            modelProvider: sub.model_provider,
            modelName: sub.model_name
          });
          provider = sub.model_provider || modelConfig.provider;
          reqModel = modelConfig.model;
          reqBaseUrl = modelConfig.baseUrl;
          reqApiKey = modelConfig.apiKey;
        }
      }

      // Cloud SaaS users must supply credentials for paid providers.
      // Local and private-server installs deliberately use the server-managed route.
      if (userId && requiresPersonalApiKey(effectiveRole)) {
        const isLocalProvider = reqBaseUrl.includes('localhost') || reqBaseUrl.includes('127.0.0.1') || reqBaseUrl.includes('host.docker.internal');
        const isFreeModel = provider === 'openrouter' && reqModel.endsWith(':free');
        const credentialProvider = inferUserApiKeyProvider(provider, reqBaseUrl);

        let userKeyConfig = null;
        try {
          userKeyConfig = await getUserApiKeyConfig(userId, credentialProvider);
        } catch (keyErr) {
          if (!isLocalProvider && !isFreeModel) {
            throw new Error('Credit usage restricted. Unable to verify a personal API key.');
          }
          console.warn('[Tenancy] Personal key lookup failed:', keyErr.message);
        }

        if (userKeyConfig) {
          reqApiKey = userKeyConfig.apiKey;
          if (userKeyConfig.modelName) reqModel = userKeyConfig.modelName;
        } else if (!isLocalProvider && !isFreeModel) {
          throw new Error(`Credit usage restricted. "${reqModel}" requires a personal API key. Please add one in Settings or switch to a ":free" model.`);
        }
      }

      if (agent) {
        const memoryPrompt = await buildSystemPrompt(agentId, lastUserMsg, userId);
        if (memoryPrompt) systemPrompt = memoryPrompt;
      } else {
        const sub = await getSubAgentById(agentId);
        if (sub) {
          systemPrompt = await buildSubAgentSystemPrompt(sub);
        }
      }
    } catch (err) {
      if (err.message.includes('Credit usage restricted')) throw err;
      console.warn('Chat context preparation failed:', err.message);
    }
  }

  if (ensuredProject?.path) {
    systemPrompt += [
      '',
      '## Canvas Project Context',
      `The current canvas context scopes your work to local project "${ensuredProject.name}" at ${ensuredProject.path}.`,
      `Use project tools with project: "${ensuredProject.name}" unless the user explicitly points you somewhere else.`,
    ].join('\n');
  }

  const impactPrompt = formatChangeImpactForPrompt(changeImpact);
  if (impactPrompt) systemPrompt += `\n\n${impactPrompt}`;

  const chatMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => {
      let content = m.text || '';
      const isFromOtherAgent = m.from !== 'me' && m.from !== 'system' && m.from !== agentId;
      const textPrefix = isFromOtherAgent ? `[${m.from}]: ` : '';

      if (m.image) {
        content = [
          { type: 'text', text: `${textPrefix}${m.text || 'Describe this image.'}` },
          { type: 'image_url', image_url: { url: m.image } }
        ];
      } else if (isFromOtherAgent) {
        content = `${textPrefix}${content}`;
      }

      return {
        role: m.from === 'system' ? 'system' : (m.from === 'me' || isFromOtherAgent ? 'user' : 'assistant'),
        content,
      };
    }),
  ];

  const toolsForCaller = (dbReady() && agentId)
    ? await filterToolsForAgent(agentId)
    : null;

  return {
    reqModel, reqBaseUrl, reqApiKey, reqProvider: provider, chatMessages, toolsForCaller, changeImpact
  };
}
