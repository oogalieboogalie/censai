import { dbReady } from '../../dbState.js';
import { logConversation, runHealingCascadeIfMentioned } from '../../memory.js';
import { getApiKey, publicToolActions, publicTimings } from './shared.js';
import { prepareChatContext } from './chatContext.js';
import { runChatLoop } from './chatExecution.js';

export async function handleChat(req, res) {
  const { messages, agentId, windowId, workspaceId, currentProject, stream } = req.body;
  const startedAt = Date.now();
  const timings = {
    total_ms: 0,
    setup_ms: 0,
    model_ms: 0,
    tool_ms: 0,
    model_calls: [],
    tool_calls: [],
  };

  const isStreaming = !!stream;
  if (isStreaming) {
    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
  }

  const sendEvent = (obj) => {
    if (isStreaming) {
      res.write(JSON.stringify(obj) + '\n');
      if (typeof res.flush === 'function') res.flush();
    }
  };

  if (!getApiKey()) {
    const errorPayload = {
      text: "No API key configured. Set AI_API_KEY in your .env file.",
      timings,
    };
    if (isStreaming) {
      sendEvent({ type: 'result', ...errorPayload });
      return res.end();
    } else {
      return res.json(errorPayload);
    }
  }

  try {
    const setupStartedAt = Date.now();
    const {
      reqModel, reqBaseUrl, reqApiKey, reqProvider, chatMessages, toolsForCaller, changeImpact
    } = await prepareChatContext(agentId, currentProject, messages, req.session?.userId, req.session?.userRole);
    timings.setup_ms = Date.now() - setupStartedAt;
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Perf] Chat setup (prepareChatContext) for agent ${agentId} took ${timings.setup_ms}ms`);
    }

    sendEvent({ type: 'status', status: 'thinking', detail: { round: 1 } });
    if (changeImpact) sendEvent({ type: 'change_impact', impact: changeImpact });

    const { finalText, toolActions } = await runChatLoop({
      agentId, windowId, workspaceId, chatMessages, toolsForCaller, reqModel, reqBaseUrl, reqApiKey, reqProvider, sendEvent, timings,
      userId: req.session?.userId
    });

    // Log conversation
    const lastUserMsg = messages?.filter(m => m.from === 'me').pop()?.text;
    if (dbReady() && agentId && lastUserMsg) {
      logConversation(agentId, 'user', lastUserMsg).catch(() => {});
      logConversation(agentId, 'assistant', finalText).catch(() => {});

      // Reactive Memory Healing Cascade
      runHealingCascadeIfMentioned(lastUserMsg, 'Alex').catch(err => {
        console.error('[FMHA] Error in chat healing cascade:', err.message);
      });
    }

    timings.total_ms = Date.now() - startedAt;
    const safeTools = publicToolActions(toolActions);
    const safeTimings = publicTimings(timings);

    if (isStreaming) {
      sendEvent({
        type: 'result',
        text: finalText,
        tools: safeTools,
        timings: safeTimings,
        changeImpact,
      });
      res.end();
    } else {
      res.json({
        text: finalText,
        tools: safeTools,
        timings: safeTimings,
        changeImpact,
      });
    }
  } catch (err) {
    console.error('Chat API error:', err.message);
    timings.total_ms = Date.now() - startedAt;
    if (isStreaming) {
      sendEvent({
        type: 'result',
        text: `API error: ${err.message}`,
        timings,
      });
      res.end();
    } else {
      res.status(500).json({ text: `API error: ${err.message}`, timings });
    }
  }
}
