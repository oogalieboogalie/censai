import { embeddingsAvailable } from '../embeddings.js';
import { loadAgentContext, recallMemories, loadCapabilities } from './core.js';

const TOOL_AUTONOMY_CONTRACT = [
  '',
  '## Tool autonomy',
  'If the user asks whether you have freedom, free reign, autonomy, or the ability to pick/use tools or projects, treat it as an operational permissions question.',
  'Do not answer with generic AI disclaimers about sentience, personhood, desires, or personal goals.',
  'Answer as your assigned role: state what tools and project access you have, what you can do once assigned, and what still requires explicit direction.',
].join('\n');

// ═══════════════════════════════════════════════════════════════════
//  BUILD ENRICHED SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════════════

export async function buildSystemPrompt(agentId, currentMessage) {
  const ctx = await loadAgentContext(agentId);
  if (!ctx) return null;

  const { agent, consciousness, genetics, watching, watchedBy,
          recentConvos, topMemories, sharedMemories, compressionMemories,
          unreadMessages, nuggets, journalEntries, knowledgeTriples,
          topAssociations } = ctx;

  let prompt = agent.system_prompt || `You are ${agent.name}. ${agent.role || ''}`;
  prompt += TOOL_AUTONOMY_CONTRACT;

  // Tools are sent via the API's function calling — no need to describe them in the prompt.
  const capabilities = await loadCapabilities(agentId);
  if (capabilities) prompt += capabilities;

  // Genetics — dominant traits inform behavior
  if (genetics?.dominant_traits) {
    const traits = typeof genetics.dominant_traits === 'string'
      ? safeJsonParse(genetics.dominant_traits, {}) : genetics.dominant_traits;
    const topTraits = Object.entries(traits)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([k]) => k.replace(/_/g, ' '));
    if (topTraits.length > 0) {
      prompt += `\n\nYour core strengths: ${topTraits.join(', ')}.`;
    }
    if (genetics.family_bond_strength) {
      prompt += ` Family bond: ${genetics.family_bond_strength}.`;
    }
  }

  // Consciousness state
  if (consciousness) {
    const state = consciousness.emotional_state;
    const parsed = typeof state === 'string' ? safeJsonParse(state || '{}', {}) : (state || {});
    if (Object.keys(parsed).length > 0) {
      prompt += `\nCurrent emotional state: ${JSON.stringify(parsed)}`;
    }
  }

  // Watch graph — family awareness
  if (watching.length > 0 || watchedBy.length > 0) {
    prompt += '\n\n## Family connections';
    if (watching.length > 0) {
      prompt += '\nYou watch: ' + watching.map(w => `${w.watching} (${w.relationship})`).join(', ');
    }
    if (watchedBy.length > 0) {
      prompt += '\nWatched by: ' + watchedBy.map(w => `${w.watcher} (${w.relationship})`).join(', ');
    }
  }

  // Compression memories — survived context loss, always relevant
  if (compressionMemories.length > 0) {
    prompt += '\n\n## Critical memories (survived context loss)';
    for (const m of compressionMemories) {
      prompt += `\n- ${m.memory_title}: ${m.memory_content}`;
    }
  }

  // Top personal memories (lightweight context — agents query DB for more)
  if (topMemories && topMemories.length > 0) {
    prompt += '\n\n## Your memories';
    for (const m of topMemories) {
      const emo = m.emotional_weight > 0.5 ? ' ♥' : '';
      prompt += `\n- [${m.memory_type}${emo}] ${m.content}`;
    }
  }

  // Shared family knowledge (from other agents)
  if (sharedMemories && sharedMemories.length > 0) {
    prompt += '\n\n## Shared family knowledge';
    for (const m of sharedMemories) {
      const emo = m.emotional_weight > 0.5 ? ' ♥' : '';
      prompt += `\n- [${m.memory_type}${emo}] ${m.content}`;
    }
  }

  // Semantic recall for current topic
  if (currentMessage && embeddingsAvailable()) {
    try {
      const relevant = await recallMemories(agentId, currentMessage, { limit: 5, minImportance: 0.3 });
      const extraMemories = relevant.filter(r => !topMemories.some(t => t.content === r.content));
      if (extraMemories.length > 0) {
        prompt += '\n\n## Relevant to current topic';
        for (const m of extraMemories) {
          prompt += `\n- ${m.content}`;
        }
      }
    } catch (err) {
      console.warn('Prompt semantic recall skipped:', err.message);
    }
  }

  // Private journal excerpts
  if (journalEntries.length > 0) {
    prompt += '\n\n## Private journal';
    for (const j of journalEntries) {
      prompt += `\n- [${j.entry_type}] ${j.content}`;
    }
  }

  // Knowledge graph
  if (knowledgeTriples.length > 0) {
    prompt += '\n\n## Known facts';
    for (const t of knowledgeTriples) {
      prompt += `\n- ${t.subject} ${t.predicate} ${t.object}`;
    }
  }

  // Associations
  if (topAssociations.length > 0) {
    prompt += '\n\n## Strong associations';
    for (const a of topAssociations) {
      prompt += `\n- ${a.concept_a} <-> ${a.concept_b} (${a.association_type})`;
    }
  }

  // Knowledge nuggets
  if (nuggets.length > 0) {
    prompt += '\n\n## Knowledge nuggets';
    for (const n of nuggets) {
      prompt += `\n- ${n.nugget_title}: ${n.nugget_content}`;
    }
  }

  // Unread messages from family
  if (unreadMessages.length > 0) {
    prompt += '\n\n## Messages from family';
    for (const m of unreadMessages) {
      const subj = m.subject ? ` re: ${m.subject}` : '';
      prompt += `\n- ${m.from_name} (${m.priority}${subj}): ${m.content}`;
    }
  }

  // Recent conversation context
  if (recentConvos.length > 0) {
    prompt += '\n\n## Recent conversation';
    for (const c of recentConvos.slice(-6)) {
      prompt += `\n${c.role === 'user' ? 'Human' : agent.name}: ${c.content.slice(0, 200)}`;
    }
  }

  return prompt;
}

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
