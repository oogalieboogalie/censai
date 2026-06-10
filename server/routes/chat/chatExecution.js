import { executeTool, TOOL_DEFINITIONS } from '../../tools.js';
import {
  MAX_CHAT_MODEL_ROUNDS, FORCE_TOOL_SYNTHESIS_AFTER_ROUNDS
} from './shared.js';
import {
  shouldSynthesizeAfterToolBatch,
  buildToolSynthesisPrompt, summarizeToolActions
} from './prompts.js';
import { extractMessageText } from './shared.js';

export async function runChatLoop({
  agentId, windowId, chatMessages, toolsForCaller, reqModel, reqBaseUrl, reqApiKey, sendEvent, timings
}) {
  let toolActions = [];
  let finalText = '';
  let synthesisRequested = false;
  let synthesisReason = null;
  let round = 0;

  for (;;) {
    round += 1;
    if (round > MAX_CHAT_MODEL_ROUNDS) {
      finalText = summarizeToolActions(toolActions);
      break;
    }
    if (round > 1) {
      sendEvent({ type: 'status', status: 'thinking', detail: { round } });
    }
    const body = {
      model: reqModel,
      max_tokens: 4096,
      messages: chatMessages,
      ...(toolsForCaller && !synthesisRequested ? { tools: toolsForCaller } : {}),
    };

    const modelStartedAt = Date.now();
    const response = await fetch(`${reqBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${reqApiKey}`
      },
      body: JSON.stringify(body)
    });
    const modelMs = Date.now() - modelStartedAt;
    timings.model_ms += modelMs;
    timings.model_calls.push({
      round,
      ms: modelMs,
      messages: chatMessages.length,
      tools_available: toolsForCaller?.length || 0,
      synthesis_requested: synthesisRequested,
      synthesis_reason: synthesisReason,
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`${response.status}: ${err}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    const msg = choice?.message;

    if (!synthesisRequested && msg?.tool_calls && msg.tool_calls.length > 0) {
      const calls = msg.tool_calls.slice(0, 15);
      chatMessages.push({ ...msg, tool_calls: calls });
      const requiredArgsByTool = new Map(
        (toolsForCaller || TOOL_DEFINITIONS).map(t => [
          t.function.name,
          t.function.parameters?.required || [],
        ])
      );

      for (const call of calls) {
        const toolName = call.function.name;
        let args = {};
        let argError = null;
        const rawArgs = call.function.arguments || '{}';
        try {
          args = JSON.parse(rawArgs);
        } catch (err) {
          argError = `Tool argument parse error: ${err.message}`;
        }

        if (!argError) {
          const missing = (requiredArgsByTool.get(toolName) || [])
            .filter(key => args?.[key] === undefined || args?.[key] === null || args?.[key] === '');
          if (missing.length > 0) {
            argError = `Tool argument validation error: missing required ${missing.join(', ')}`;
          }
        }
        if (toolName === 'local_dev_restart' && windowId) {
          args.__window_id = windowId;
        }

        const PRIVATE_TOOLS = ['journal', 'read_journal', 'read_journal_search'];
        sendEvent({ type: 'status', status: 'calling_tool', detail: { tool: toolName, args: PRIVATE_TOOLS.includes(toolName) ? {} : args } });

        const toolStartedAt = Date.now();
        const result = argError
          ? `${argError}. Call ${toolName} again with the required arguments.`
          : await executeTool(agentId, toolName, args);
        const toolMs = Date.now() - toolStartedAt;
        timings.tool_ms += toolMs;
        sendEvent({ type: 'status', status: 'completed_tool', detail: { tool: toolName, ms: toolMs } });

        const safeResult = PRIVATE_TOOLS.includes(toolName) ? '[private]' : result;
        const resultText = typeof safeResult === 'string' ? safeResult : JSON.stringify(safeResult);
        const resultPreview = resultText.length > 260 ? `${resultText.slice(0, 260)}...` : resultText;
        const action = {
          tool: toolName,
          args: PRIVATE_TOOLS.includes(toolName) ? {} : args,
          result: safeResult,
          result_preview: resultPreview,
          result_chars: resultText.length,
          ms: toolMs,
          round,
        };
        toolActions.push(action);
        timings.tool_calls.push({
          tool: toolName,
          ms: toolMs,
          round,
          result_chars: resultText.length,
        });

        // Feed result back to model
        chatMessages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: result,
        });
      }

      if (!synthesisRequested && toolActions.length > 0 && shouldSynthesizeAfterToolBatch(toolActions, round)) {
        synthesisRequested = true;
        synthesisReason = round >= FORCE_TOOL_SYNTHESIS_AFTER_ROUNDS ? 'tool_round_limit' : 'direct_after_write';
        chatMessages.push({
          role: 'user',
          content: buildToolSynthesisPrompt(toolActions),
        });
      }

      // Continue loop — model will process tool results and either
      // call more tools or respond with text
      continue;
    }

    // Model responded with text — we're done. Some OpenAI-compatible local
    // providers occasionally return an empty assistant message after tools;
    // give them one explicit synthesis pass before falling back to tool output.
    finalText = extractMessageText(msg?.content);
    if (!finalText && toolActions.length > 0 && !synthesisRequested) {
      synthesisRequested = true;
      synthesisReason = 'empty_after_tools';
      chatMessages.push({
        role: 'user',
        content: buildToolSynthesisPrompt(toolActions),
      });
      continue;
    }
    if (!finalText) finalText = summarizeToolActions(toolActions);
    break;
  }

  return { finalText, toolActions };
}
