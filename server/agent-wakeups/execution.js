import { getAgent, buildSystemPrompt, markMessageRead, sendAgentMessage } from '../memory.js';
import { buildWakePrompt } from './prompt.js';
import { getWakeupTasks, loadWakeupContext, updateWakeup } from './store.js';
import { runWakeModel } from './modelLoop.js';

const TERMINAL = new Set(['completed', 'failed', 'cancelled']);

export async function runAgentWakeup(claimed) {
  const wake = await loadWakeupContext(claimed.id);
  if (!wake) return;
  try {
    const agent = await getAgent(wake.agent_id);
    if (!agent) throw new Error(`Recipient agent "${wake.agent_id}" not found`);
    const tasks = await getWakeupTasks(wake.id);
    if (tasks.length && tasks.every(task => TERMINAL.has(task.status))) wake.phase = 'review';

    const systemPrompt = await buildSystemPrompt(agent.id, wake.content);
    const outcome = await runWakeModel({
      agent,
      systemPrompt: `${systemPrompt}\n\n## Family work protocol\nMessages can wake family members. Delegate when useful, review receipts before reporting success, and never claim unverified work is complete.`,
      userPrompt: buildWakePrompt(wake, tasks),
      wakeId: wake.id,
      messageId: wake.message_id,
    });
    const linkedTasks = await getWakeupTasks(wake.id);
    const active = linkedTasks.some(task => !TERMINAL.has(task.status));

    await markMessageRead(wake.message_id);
    if (active) {
      await sendAgentMessage(agent.id, wake.sender_id,
        `${agent.name} acknowledged "${wake.subject || 'your request'}" and delegated ${linkedTasks.length} task(s). I will review the receipts and report back.`,
        { messageType: 'agent_ack', threadId: wake.thread_id || wake.message_id, wake: false }
      );
      await updateWakeup(wake.id, { status: 'waiting_children', phase: 'review', response: outcome.text });
      return;
    }

    const shouldReport = wake.message_type !== 'agent_report' || wake.phase === 'review';
    if (shouldReport && outcome.text) {
      await sendAgentMessage(agent.id, wake.sender_id, outcome.text, {
        messageType: 'agent_report',
        priority: 'high',
        threadId: wake.thread_id || wake.message_id,
        wake: true,
      });
    }
    await updateWakeup(wake.id, { status: 'completed', response: outcome.text });
  } catch (err) {
    await updateWakeup(wake.id, { status: 'failed', error: err.message });
    throw err;
  }
}
