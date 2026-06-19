import { callModel, resolveChatModelConfig } from '../aiGateway/index.js';
import { executeTool, filterToolsForAgent } from '../tools.js';

const MAX_ROUNDS = 20;

export async function runWakeModel({ agent, systemPrompt, userPrompt, wakeId, messageId }) {
  const config = resolveChatModelConfig({
    modelProvider: agent.model_provider,
    modelName: agent.model_name,
  });
  const tools = await filterToolsForAgent(agent.id);
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
  const toolCalls = [];

  for (let round = 1; round <= MAX_ROUNDS; round++) {
    const data = await callModel({
      config,
      body: { model: config.model, max_tokens: 4096, messages, tools },
      logContext: { source: 'agent-wakeup', agentId: agent.id, wakeId, round },
    });
    const msg = data.choices?.[0]?.message;
    if (!msg?.tool_calls?.length) {
      return { text: String(msg?.content || '').trim(), toolCalls };
    }
    const calls = msg.tool_calls.slice(0, 10);
    messages.push({ ...msg, tool_calls: calls });
    for (const call of calls) {
      let args = {};
      try { args = JSON.parse(call.function.arguments || '{}'); } catch {}
      const result = await executeTool(agent.id, call.function.name, args, {
        agentWakeId: wakeId,
        sourceMessageId: messageId,
      });
      toolCalls.push(call.function.name);
      messages.push({ role: 'tool', tool_call_id: call.id, content: String(result) });
    }
  }
  return { text: 'Wake cycle reached the model round limit.', toolCalls };
}
