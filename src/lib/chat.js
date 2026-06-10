import { getAgentById } from './agentStore.js';

const FALLBACK_REPLIES = {
  censai:     'Sketching three editorial angles — punchy / analytical / industry-gossip.',
  atlas:      "I'll stand up the API skeleton and wire the queue in the morning.",
  genesis:    'Reading like a focus issue. Letting tension and rhythm guide the layout.',
  nexus:      "Schema looks tight. I'll add an index on `published_at`.",
  foundation: 'Spinning up a dev container with the staging compose file.',
  architect:  "Aligned. I'll route this through the right teammates.",
  echo:       "From a market angle, this is a strong differentiator. Saving as a strategy note.",
};

function fallbackReply(agent, prompt) {
  const lower = prompt.toLowerCase();
  if (lower.includes('newsletter')) return "Got it. Drafting the AI news roundup outline now — want me to source last week's headlines first?";
  if (lower.includes('todo') || lower.includes('do')) return "On it. I'll fan out from the project to-dos.";
  if (lower.includes('?')) return 'Good question. Pulling context from memory + connectors. One sec.';
  return FALLBACK_REPLIES[agent.id] || 'Ack.';
}

export async function sendMessage(agentId, messages) {
  const data = await sendMessageWithMeta(agentId, messages);
  return data.text;
}

export async function sendMessageWithMeta(agentId, messages, opts = {}) {
  const agent = getAgentById(agentId);

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/x-ndjson'
      },
      body: JSON.stringify({ 
        messages, 
        agentId, 
        windowId: opts.windowId,
        currentProject: opts.currentProject,
        stream: true 
      }),
    });

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/x-ndjson') && !contentType.includes('text/event-stream')) {
      const data = await res.json();
      return {
        text: data.text,
        timings: data.timings,
        tools: data.tools,
      };
    }

    let finalText = '';
    let finalTimings = null;
    let finalTools = [];

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    const handleLine = (line) => {
      try {
        const event = JSON.parse(line);
        if (event.type === 'status' && opts.onStatusUpdate) {
          opts.onStatusUpdate(event.status, event.detail);
        } else if (event.type === 'result') {
          finalText = event.text;
          finalTimings = event.timings;
          finalTools = event.tools;
        }
      } catch (err) {
        console.error('Failed to parse streaming line:', err, line);
      }
    };

    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        if (buffer.trim()) {
          handleLine(buffer.trim());
        }
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // save the partial line back to buffer
      for (const line of lines) {
        if (line.trim()) {
          handleLine(line.trim());
        }
      }
    }

    return {
      text: finalText,
      timings: finalTimings,
      tools: finalTools,
    };
  } catch (err) {
    console.error('Fetch error:', err);
    return { text: fallbackReply(agent, messages[messages.length - 1]?.text || '') };
  }
}
