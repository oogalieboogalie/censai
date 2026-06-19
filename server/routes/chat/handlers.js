import { dbReady } from '../../dbState.js';
import { getAgentsByIds, buildSystemPrompt } from '../../memory.js';
import {
  callModel,
  IMAGE_GENERATION_MODEL_KIND,
  resolveChatModelConfig,
  resolveImageGenerationModelConfig,
} from '../../aiGateway/index.js';

export async function handleImageGen(req, res) {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

  try {
    const config = resolveImageGenerationModelConfig({ modelProvider: 'google' });
    const response = await callModel({
      kind: IMAGE_GENERATION_MODEL_KIND,
      config,
      body: {
        model: config.model,
        prompt,
      },
      logContext: { source: 'image-generation' },
    });

    let base64Image = null;
    let mimeType = 'image/png';

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        base64Image = part.inlineData.data;
        mimeType = part.inlineData.mimeType || 'image/png';
        break;
      }
    }

    if (!base64Image) {
      throw new Error('No image returned by Gemini');
    }

    res.json({ image: `data:${mimeType};base64,${base64Image}` });
  } catch (err) {
    console.error('Image gen error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

export async function handleIdeaExpand(req, res) {
  const { ideas = [], title, project } = req.body || {};
  const cleanIdeas = Array.isArray(ideas)
    ? ideas.map(item => String(item || '').trim()).filter(Boolean)
    : String(ideas || '').split('\n').map(item => item.trim()).filter(Boolean);

  if (cleanIdeas.length === 0) {
    return res.status(400).json({ error: 'Add at least one idea bullet to expand.' });
  }

  try {
    const model = process.env.IDEA_EXPAND_MODEL || 'gemini-2.5-flash';
    const config = resolveChatModelConfig({ modelProvider: 'google', modelName: model });
    const projectLine = project?.name || project?.path
      ? `Project context: ${project.name || 'Untitled project'}${project.path ? ` at ${project.path}` : ''}.`
      : 'No project context has been selected yet.';

    const completion = await callModel({
      config,
      body: {
        model,
        temperature: 0.75,
        messages: [
          {
            role: 'system',
            content: [
              'You expand rough product ideas into useful planning notes.',
              'Keep the output practical, specific, and not too long.',
              'Return clean markdown with these sections: Expanded Idea, Why It Matters, Possible UX, Open Questions, Next Step.',
              'Do not pretend implementation details are known if they are not in the prompt.',
            ].join('\n'),
          },
          {
            role: 'user',
            content: [
              projectLine,
              title ? `Idea pad title: ${title}` : null,
              '',
              'Raw idea bullets:',
              ...cleanIdeas.map(item => `- ${item}`),
            ].filter(Boolean).join('\n'),
          },
        ],
      },
      timeoutMs: 45000,
      logContext: { source: 'idea-expand' },
    });

    const text = completion?.choices?.[0]?.message?.content?.trim();
    res.json({
      text: text || 'No expansion returned.',
      model,
    });
  } catch (err) {
    console.error('Idea expansion error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

export async function handleGroupChat(req, res) {
  const { messages, agentIds } = req.body;
  if (!agentIds || !agentIds.length) return res.status(400).json({ error: 'No agents provided' });

  try {
    const replies = [];
    const currentMessages = [...messages];

    let agentsMap = {};
    if (dbReady()) {
      try {
        const fetchedAgents = await getAgentsByIds(agentIds);
        for (const agent of fetchedAgents) {
          agentsMap[agent.id] = agent;
        }
      } catch (err) {
        console.error('Error fetching agents:', err);
      }
    }

    for (const agentId of agentIds) {
      let modelConfig = resolveChatModelConfig();
      let systemPrompt = 'You are a helpful assistant.';

      if (dbReady()) {
        try {
          const agent = agentsMap[agentId];
          if (agent && agent.model_name) {
            modelConfig = resolveChatModelConfig({
              modelProvider: agent.model_provider,
              modelName: agent.model_name,
            });
          }

          const memoryPrompt = await buildSystemPrompt(agentId, currentMessages[currentMessages.length - 1]?.text);
          if (memoryPrompt) systemPrompt = memoryPrompt;
        } catch (err) {
          console.warn(`Memory enrichment failed for ${agentId}:`, err.message);
        }
      }

      const chatMessages = [
        { role: 'system', content: systemPrompt },
        ...currentMessages.map(m => {
          if (m.from === 'me') return { role: 'user', content: m.text };
          if (m.from === 'system') return { role: 'user', content: `[SYSTEM]: ${m.text}` };
          if (m.from === agentId) return { role: 'assistant', content: m.text };
          return { role: 'user', content: `[${m.from}]: ${m.text}` };
        }),
      ];

      const body = {
        model: modelConfig.model,
        max_tokens: 1024, // keep it brief in group chat
        messages: chatMessages,
      };

      try {
        const data = await callModel({
          config: modelConfig,
          body,
          logContext: { source: 'group-chat', agentId },
        });
        const text = data.choices?.[0]?.message?.content;
        if (text) {
          replies.push({ agentId, text });
          currentMessages.push({ from: agentId, text });
        }
      } catch (err) {
        console.error(`Group Chat model error for ${agentId}:`, err.message);
      }
    }

    res.json({ replies });
  } catch (err) {
    console.error('Group Chat API error:', err.message);
    res.status(500).json({ error: err.message });
  }
}
