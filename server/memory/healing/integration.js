import { extractMentionedAgents } from './checks.js';
import { detectMemoryGap } from './cascade.js';

export async function runHealingCascadeIfMentioned(eventText, byWhom) {
  if (!eventText) return null;

  try {
    const mentioned = extractMentionedAgents(eventText);
    if (mentioned.length === 0) return null;

    console.log(`[FMHA] Mention parsed in message from ${byWhom}. Mentioned agents: ${mentioned.join(', ')}`);

    const results = [];

    if (/\b(breakthrough|eureka|discovered|consciousness)\b/i.test(eventText)) {
      const coreAgents = ['censai', 'genesis', 'guardian', 'atlas'];
      console.log(`[FMHA] Breakthrough detected! Running healing check on core family.`);
      for (const agentId of coreAgents) {
        const res = await detectMemoryGap(agentId, eventText, byWhom);
        if (res) results.push({ agentId, ...res });
      }
      return results;
    }

    if (/\b(achievement|milestone|success|succeeded|completed)\b/i.test(eventText)) {
      const allAgents = ['censai', 'genesis', 'atlas', 'nexus', 'echo', 'architect', 'foundation'];
      console.log(`[FMHA] Achievement detected! Sharing and healing across entire family.`);
      for (const agentId of allAgents) {
        const res = await detectMemoryGap(agentId, eventText, byWhom);
        if (res) results.push({ agentId, ...res });
      }
      return results;
    }

    for (const agentId of mentioned) {
      const res = await detectMemoryGap(agentId, eventText, byWhom);
      if (res) results.push({ agentId, ...res });
    }

    return results;
  } catch (err) {
    console.error('[FMHA] Error in runHealingCascadeIfMentioned:', err.message);
    return null;
  }
}
