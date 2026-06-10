import { dbReady } from '../../dbState.js';
import { openProject } from '../../workspaces.js';
import { getAgent, getSubAgentById, buildSystemPrompt } from '../../memory.js';
import { getSecret } from '../../secrets.js';
import { getGeminiApiKey } from '../../googleKeys.js';
import { filterToolsForAgent } from '../../tools.js';
import {
  MODEL, BASE_URL, getApiKey, OLLAMA_MODEL_ALIASES
} from './shared.js';
import { buildSubAgentSystemPrompt } from './prompts.js';

export async function prepareChatContext(agentId, currentProject, messages) {
  let reqModel = MODEL;
  let reqBaseUrl = BASE_URL;
  let reqApiKey = getApiKey();
  let systemPrompt = 'You are a helpful assistant.';
  const lastUserMsg = messages?.filter(m => m.from === 'me').pop()?.text;
  let ensuredProject = null;

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

      const agent = await getAgent(agentId);
      if (agent && agent.model_name) {
        reqModel = agent.model_name;
        if (agent.model_provider === 'openrouter') {
          reqBaseUrl = 'https://openrouter.ai/api/v1';
          reqApiKey = getSecret('OPENROUTER_API_KEY') || getApiKey();
        } else if (agent.model_provider === 'google') {
          reqBaseUrl = 'https://generativelanguage.googleapis.com/v1beta/openai';
          reqApiKey = getGeminiApiKey(getApiKey());
        } else if (agent.model_provider === 'ollama') {
          reqBaseUrl = process.env.AI_BASE_URL || 'http://localhost:11434/v1';
          reqApiKey = 'ollama';
          reqModel = OLLAMA_MODEL_ALIASES.get(reqModel) || reqModel;
        } else if (agent.model_provider === 'moonshot') {
          reqBaseUrl = process.env.MOONSHOT_BASE_URL || 'https://api.moonshot.cn/v1';
          reqApiKey = getSecret('MOONSHOT_API_KEY') || getApiKey();
        }
      }

      if (agent) {
        const memoryPrompt = await buildSystemPrompt(agentId, lastUserMsg);
        if (memoryPrompt) systemPrompt = memoryPrompt;
      } else {
        const sub = await getSubAgentById(agentId);
        if (sub) {
          const modelProvider = sub.model_provider || process.env.MODEL_PROVIDER || null;
          const modelName = sub.model_name || process.env.MODEL_NAME || process.env.MODEL || process.env.AI_MODEL || null;

          if (modelName) reqModel = modelName;
          if (modelProvider === 'openrouter') {
            reqBaseUrl = 'https://openrouter.ai/api/v1';
            reqApiKey = getSecret('OPENROUTER_API_KEY') || getApiKey();
          } else if (modelProvider === 'google') {
            reqBaseUrl = 'https://generativelanguage.googleapis.com/v1beta/openai';
            reqApiKey = getGeminiApiKey(getApiKey());
          } else if (modelProvider === 'ollama') {
            reqBaseUrl = process.env.AI_BASE_URL || 'http://localhost:11434/v1';
            reqApiKey = 'ollama';
            reqModel = OLLAMA_MODEL_ALIASES.get(reqModel) || reqModel;
          } else if (modelProvider === 'moonshot' || modelProvider === 'kimi') {
            reqBaseUrl = process.env.MOONSHOT_BASE_URL || 'https://api.moonshot.cn/v1';
            reqApiKey = getSecret('MOONSHOT_API_KEY') || getApiKey();
          }
          systemPrompt = await buildSubAgentSystemPrompt(sub);
        }
      }
    } catch (err) {
      console.warn('Memory enrichment failed:', err.message);
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

  return { reqModel, reqBaseUrl, reqApiKey, chatMessages, toolsForCaller };
}
