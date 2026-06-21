import { createArtifact, createWorkspaceEvent } from './factories.js';

/**
 * Creates a new agent session trace artifact.
 */
export async function createSessionTrace(ctx, { workspaceId, agentId, windowId, initialContext }) {
  return createArtifact(ctx, {
    workspaceId,
    type: 'agent_session_trace',
    title: `Chat Session: ${agentId} (${new Date().toISOString()})`,
    owner: { kind: 'agent', id: agentId },
    data: {
      agentId,
      windowId,
      initialContext,
      status: 'active',
      startedAt: new Date().toISOString(),
    },
    metadata: {
      source: 'chat_api',
    },
  });
}

/**
 * Records a round of agent reasoning and tool usage.
 */
export async function recordTraceRound(ctx, { workspaceId, traceId, round, messages, toolsAvailable, modelConfig }) {
  return createWorkspaceEvent(ctx, {
    workspaceId,
    type: 'agent.round',
    actor: { kind: 'system', id: 'observability' },
    artifactId: traceId,
    payload: {
      round,
      messagesCount: messages.length,
      toolsAvailableCount: toolsAvailable?.length || 0,
      modelConfig,
    },
  });
}

/**
 * Records a tool invocation and its result.
 */
export async function recordToolTrace(ctx, { workspaceId, traceId, toolName, args, result, ms, ok, round }) {
  return createWorkspaceEvent(ctx, {
    workspaceId,
    type: 'tool.invocation',
    actor: { kind: 'system', id: 'observability' },
    artifactId: traceId,
    payload: {
      toolName,
      args,
      resultPreview: typeof result === 'string' ? result.slice(0, 500) : result,
      ms,
      ok,
      round,
    },
  });
}

/**
 * Records a session failure with full context.
 */
export async function recordTraceFailure(ctx, { workspaceId, traceId, error, contextSnapshot }) {
  return createWorkspaceEvent(ctx, {
    workspaceId,
    type: 'session.failure',
    actor: { kind: 'system', id: 'observability' },
    artifactId: traceId,
    payload: {
      error: error.message || String(error),
      stack: error.stack,
      contextSnapshot,
    },
  });
}

/**
 * Updates the trace artifact with final summary data.
 */
export async function finalizeTrace(ctx, { traceId, status, finalText, timings, totalTokens }) {
  const db = ctx.db;
  await db.query(
    `UPDATE artifacts
     SET status = $2,
         data = data || $3::jsonb,
         updated_at = NOW()
     WHERE id = $1`,
    [
      traceId,
      status === 'failed' ? 'archived' : 'active',
      JSON.stringify({
        status,
        finalTextPreview: finalText?.slice(0, 500),
        timings,
        totalTokens,
        endedAt: new Date().toISOString(),
      }),
    ]
  );
}
