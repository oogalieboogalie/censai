import { executeTool, TOOL_DEFINITIONS } from '../../tools.js';
import { callModel, workspaceUsageSink } from '../../aiGateway/index.js';
import {
  MAX_CHAT_MODEL_ROUNDS, FORCE_TOOL_SYNTHESIS_AFTER_ROUNDS, extractMessageText
} from './shared.js';
import {
  shouldSynthesizeAfterToolBatch,
  buildToolSynthesisPrompt, summarizeToolActions
} from './prompts.js';
import { withLongcatToolCallFallback } from './longcatToolCalls.js';
import { processAgentMarkers } from './markers.js';
import { summarizeToolCall } from './toolSummary.js';
import { toolCallOk } from './toolOutcome.js';
import { detectUnexecutedClaims } from './claimTripwire.js';

const PRIVATE_TOOLS = ['journal', 'read_journal', 'read_journal_search'];

export async function runChatLoop({
  agentId, windowId, workspaceId, chatMessages, toolsForCaller, reqModel, reqBaseUrl, reqApiKey, reqProvider, sendEvent, timings, userId
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
    const data = await callModel({
      config: {
        provider: reqProvider,
        model: reqModel,
        baseUrl: reqBaseUrl,
        apiKey: reqApiKey,
      },
      body,
      logContext: { source: 'chat-loop', round },
      usageAttribution: {
        workspaceId,
        actor: { kind: 'user', id: userId || 'local-user' },
        source: 'chat-loop',
      },
      usageSink: workspaceUsageSink,
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
    const choice = data.choices?.[0];
    const msg = withLongcatToolCallFallback(choice?.message);

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

        const isPrivate = PRIVATE_TOOLS.includes(toolName);
        const summary = isPrivate ? null : summarizeToolCall(toolName, args);
        sendEvent({ type: 'status', status: 'calling_tool', detail: { tool: toolName, args: isPrivate ? {} : args, ...(summary ? { summary } : {}) } });

        const toolStartedAt = Date.now();
        const result = argError
          ? `${argError}. Call ${toolName} again with the required arguments.`
          : await executeTool(agentId, toolName, args, { userId });
        const toolMs = Date.now() - toolStartedAt;
        timings.tool_ms += toolMs;
        const ok = toolCallOk(result);
        sendEvent({ type: 'status', status: 'completed_tool', detail: { tool: toolName, ms: toolMs, ok, ...(summary ? { summary } : {}) } });

        const safeResult = isPrivate ? '[private]' : result;
        const resultText = typeof safeResult === 'string' ? safeResult : JSON.stringify(safeResult);
        const resultPreview = resultText.length > 260 ? `${resultText.slice(0, 260)}...` : resultText;
        const action = {
          tool: toolName,
          args: isPrivate ? {} : args,
          ...(summary ? { summary } : {}),
          result: safeResult,
          result_preview: resultPreview,
          result_chars: resultText.length,
          ms: toolMs,
          round,
          ok,
        };
        toolActions.push(action);
        timings.tool_calls.push({
          tool: toolName,
          ms: toolMs,
          round,
          result_chars: resultText.length,
          ok,
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

  const markerResult = await processAgentMarkers(agentId, finalText, (aId, name, args) => executeTool(aId, name, args, { userId }), sendEvent);
  if (markerResult.markers.length > 0) {
    finalText = markerResult.text;
    toolActions.push(...markerResult.actions);
    for (const action of markerResult.actions) {
      action.ok = toolCallOk(action.result);
      timings.tool_ms += action.ms || 0;
      timings.tool_calls.push({
        tool: action.tool,
        ms: action.ms || 0,
        round: action.round,
        result_chars: action.result_chars,
        ok: action.ok,
      });
    }
  }

  const unexecutedClaimWarning = detectUnexecutedClaims(finalText, toolActions);
  if (unexecutedClaimWarning) {
    finalText = `${finalText}\n\n${unexecutedClaimWarning}`;
    sendEvent({ type: 'status', status: 'unexecuted_claim' });
  }

  return { finalText, toolActions };
}
