import { GoogleGenAI } from '@google/genai';
import { getSecret } from '../../secrets.js';
import { getGeminiApiKey } from '../../googleKeys.js';
import { dbReady } from '../../dbState.js';
import { getAgentsByIds, buildSystemPrompt } from '../../memory.js';
import {
  MODEL, BASE_URL, getApiKey, OLLAMA_MODEL_ALIASES, fetchChatCompletion
} from './shared.js';

export async function handleImageGen(req, res) {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

  try {
    const ai = new GoogleGenAI({ apiKey: getSecret('GEMINI_API_KEY') });

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-image-preview",
      contents: prompt,
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
    const baseUrl = 'https://generativelanguage.googleapis.com/v1beta/openai';
    const apiKey = getGeminiApiKey(getApiKey());
    const model = process.env.IDEA_EXPAND_MODEL || 'gemini-2.5-flash';
    const projectLine = project?.name || project?.path
      ? `Project context: ${project.name || 'Untitled project'}${project.path ? ` at ${project.path}` : ''}.`
      : 'No project context has been selected yet.';

    const completion = await fetchChatCompletion(baseUrl, apiKey, {
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
    }, 45000);

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
      let reqModel = MODEL;
      let reqBaseUrl = BASE_URL;
      let reqApiKey = getApiKey();
      let systemPrompt = 'You are a helpful assistant.';

      if (dbReady()) {
        try {
          const agent = agentsMap[agentId];
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
        model: reqModel,
        max_tokens: 1024, // keep it brief in group chat
        messages: chatMessages,
      };

      const response = await fetch(`${reqBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${reqApiKey}`
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) {
          replies.push({ agentId, text });
          currentMessages.push({ from: agentId, text });
        }
      }
    }

    res.json({ replies });
  } catch (err) {
    console.error('Group Chat API error:', err.message);
    res.status(500).json({ error: err.message });
  }
}
