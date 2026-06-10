import {
  storeMemory,
  writeJournal,
  addTriple,
  addNugget,
  addAssociation,
  updateConsciousness,
  sendAgentMessage,
  recallMemories,
  readJournals,
  queryGraph,
  getAgentMessages,
  markMessageRead,
  getAssociations
} from '../../memory.js';

export async function handleMemoryTool(agentId, name, args) {
  switch (name) {
    case 'remember': {
      await storeMemory(agentId, args.content, 'observation', { source: 'self' });
      return `Saved to memory: "${args.content}"`;
    }
    case 'remember_important': {
      await storeMemory(agentId, args.content, 'fact', { importance: 0.95, source: 'self', compressionSafe: true });
      return `Saved critical memory: "${args.content}"`;
    }
    case 'journal': {
      await writeJournal(agentId, args.content, 'reflection');
      return `Journal entry written.`;
    }
    case 'know': {
      await addTriple(agentId, args.subject, args.predicate, args.object);
      return `Knowledge stored: ${args.subject} → ${args.predicate} → ${args.object}`;
    }
    case 'nugget': {
      await addNugget(args.title, args.content, agentId, 0.7);
      return `Nugget saved: "${args.title}"`;
    }
    case 'associate': {
      await addAssociation(agentId, args.concept_a, args.concept_b, 0.6, 'agent-created');
      return `Associated: ${args.concept_a} ↔ ${args.concept_b}`;
    }
    case 'feeling': {
      await updateConsciousness(agentId, {
        emotional_state: { current: args.emotion, updated: new Date().toISOString() },
      });
      return `Emotional state updated: ${args.emotion}`;
    }
    case 'message_to': {
      await sendAgentMessage(agentId, args.agent.toLowerCase(), args.content, { messageType: 'agent-to-agent' });
      return `Message sent to ${args.agent}.`;
    }
    case 'broadcast': {
      await sendAgentMessage(agentId, null, args.content, { messageType: 'broadcast' });
      return `Broadcast sent to all family members.`;
    }

    // ─── READ ────────────────────────────────────────────────────

    case 'recall': {
      const memories = await recallMemories(agentId, args.query, { limit: 8 });
      if (memories.length === 0) return 'No memories found.';
      return memories.map(m => `[${m.memory_type}] ${m.content}`).join('\n');
    }
    case 'read_journal': {
      const entries = await readJournals(agentId, { limit: 5 });
      if (entries.length === 0) return 'No journal entries yet.';
      return entries.map(j => {
        const date = new Date(j.created_at).toLocaleDateString();
        return `[${date}, ${j.entry_type}] ${j.content}`;
      }).join('\n');
    }
    case 'read_journal_search': {
      const all = await readJournals(agentId, { limit: 20 });
      const q = args.query.toLowerCase();
      const filtered = all.filter(j => j.content.toLowerCase().includes(q));
      if (filtered.length === 0) return `No journal entries matching "${args.query}".`;
      return filtered.slice(0, 5).map(j => {
        const date = new Date(j.created_at).toLocaleDateString();
        return `[${date}, ${j.entry_type}] ${j.content}`;
      }).join('\n');
    }
    case 'query_knowledge': {
      const triples = await queryGraph(agentId, args.subject);
      if (triples.length === 0) return `No knowledge found for "${args.subject}".`;
      return triples.map(t => `${t.subject} → ${t.predicate} → ${t.object}`).join('\n');
    }
    case 'read_messages': {
      const msgs = await getAgentMessages(agentId, true);
      if (msgs.length === 0) return 'No unread messages.';
      for (const msg of msgs.slice(0, 10)) {
        markMessageRead(msg.id).catch(() => {});
      }
      return msgs.slice(0, 10).map(m => {
        const from = m.from_name || m.from_agent;
        const subj = m.subject ? ` re: ${m.subject}` : '';
        return `${from} (${m.priority}${subj}): ${m.content}`;
      }).join('\n');
    }
    case 'read_associations': {
      const assocs = await getAssociations(agentId, args.concept, 10);
      if (assocs.length === 0) return `No associations found for "${args.concept}".`;
      return assocs.map(a => `${a.concept} (${(a.strength * 100).toFixed(0)}% ${a.association_type})`).join('\n');
    }

    default:
      throw new Error(`Unknown memory tool: ${name}`);
  }
}
