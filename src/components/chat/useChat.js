import React from 'react';
import { getAgents, getAgentById } from '../../lib/agentStore.js';
import { sendMessageWithMeta } from '../../lib/chat.js';
import { scriptedReply, replyDelayMs } from '../../data/landing-chat-script.js';
import { useVisibilityAwareInterval } from '../../lib/usePolling.js';

export function useChat({ win, onUpdate, allWins, canvasGroups, currentProject, isActive }) {
  const agents = getAgents();
  const agent = getAgentById(win.agentId) || agents[1];
  const defaultMsgs = React.useMemo(() => [], [agent.id]);
  const msgs = win.msgs === undefined ? defaultMsgs : win.msgs;
  
  const setMsgs = (next) => onUpdate({ msgs: typeof next === 'function' ? next(msgs) : next });
  
  const [draft, setDraft] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [liveStatus, setLiveStatus] = React.useState({ status: 'thinking', detail: null });
  const [showAttach, setShowAttach] = React.useState(false);
  const [copiedMessage, setCopiedMessage] = React.useState(null);
  
  const scrollRef = React.useRef(null);
  
  React.useEffect(() => { 
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; 
  }, [msgs]);

  const copyMessage = React.useCallback(async (message, index) => {
    const text = String(message?.text || '');
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.focus();
      area.select();
      document.execCommand('copy');
      document.body.removeChild(area);
    }
    setCopiedMessage(index);
    window.setTimeout(() => setCopiedMessage(current => current === index ? null : current), 1200);
  }, []);

  // Poll for local dev restarts
  const pollForRestarts = React.useCallback(async (cancelled = { val: false }) => {
    if (win.demoMode || !win.id || !agent.id) return;
    try {
      const params = new URLSearchParams({ windowId: win.id, agentId: agent.id });
      const res = await fetch(`/api/local-dev-restarts/notifications?${params}`);
      if (!res.ok) return;
      const notes = await res.json();
      if (cancelled.val || !Array.isArray(notes) || notes.length === 0) return;
      setMsgs(current => [
        ...current,
        ...notes.map(n => ({
          from: 'system',
          hidden: true,
          text: n.completion_message,
          localDevRestartId: n.id,
        })),
      ]);
    } catch {}
  }, [win.demoMode, win.id, agent.id]);

  React.useEffect(() => {
    const cancelled = { val: false };
    pollForRestarts(cancelled);
    return () => { cancelled.val = true; };
  }, [pollForRestarts]);

  useVisibilityAwareInterval(() => {
    pollForRestarts();
  }, 3000, { inactive: !isActive });

  const send = async () => {
    if ((!draft.trim() && !win.imageAttachment) || sending) return;
    const userMsg = { from: 'me', text: draft.trim(), image: win.imageAttachment };

    if (win.demoMode) {
      const userText = draft.trim();
      const displayMsgs = [...msgs, userMsg];
      setMsgs(displayMsgs);
      setDraft('');
      setSending(true);
      setTimeout(() => {
        setMsgs([...displayMsgs, { from: 'agent', text: scriptedReply(userText) }]);
        setSending(false);
      }, replyDelayMs());
      return;
    }

    const modelMsgs = msgs.filter(m => !m.hidden);
    let payloadMsgs = [...modelMsgs, userMsg];

    if (currentProject?.path) {
      payloadMsgs = [
        ...payloadMsgs.slice(0, -1),
        {
          from: 'system',
          text: `[SYSTEM CONTEXT] Current Homebase project is "${currentProject.name}" at ${currentProject.path}. Use project tools with project: "${currentProject.name}" when reading, editing, testing, or assigning work. Treat this as the opened workspace folder, like a coding assistant launched in that directory.`,
        },
        payloadMsgs[payloadMsgs.length - 1],
      ];
    }

    if (canvasGroups && allWins) {
      const activeGroups = canvasGroups.filter(g => (g.attachedAgents || []).includes(agent.id));
      if (activeGroups.length > 0) {
        let groupContextText = '';
        activeGroups.forEach(g => {
          groupContextText += `\n\n--- IN GROUP: ${g.label} ---\n`;
          const inside = allWins.filter(w => {
            const cx = w.x + w.w / 2;
            const cy = w.y + w.h / 2;
            return cx >= g.x && cx <= g.x + g.w && cy >= g.y && cy <= g.y + g.h;
          });
          inside.forEach(w => {
            if (w.kind === 'doc' && w.text) groupContextText += `\n[Document Window]:\n${w.text}\n`;
            if (w.kind === 'todos' && w.items) groupContextText += `\n[Todo List Window]:\n${w.items.map(i => `${i.done?'[x]':'[ ]'} ${i.text}`).join('\n')}\n`;
            if (w.kind === 'files' && w.dirPath) groupContextText += `\n[Files Window (Local Directory)]: ${w.dirPath}\n`;
            if (w.kind === 'files' && w.githubRepo) groupContextText += `\n[Files Window (GitHub Repo)]: ${w.githubRepo}\n`;
          });
        });
        if (groupContextText.trim()) {
          payloadMsgs = [...modelMsgs, { 
            from: 'system', 
            text: `[SYSTEM CONTEXT] You are currently attached to the following visual groups on the canvas, which contain these items:\n${groupContextText}\n\nIMPORTANT INSTRUCTION: You have access to tools that can read local directories and GitHub repos. If you see a local directory path or repo above, you should proactively use the \`local_list_dir\`, \`local_read_file\`, or GitHub tools to explore its contents to assist the user.` 
          }, userMsg];
        }
      }
    }

    const displayMsgs = [...msgs, userMsg];
    setMsgs(displayMsgs);
    setDraft('');
    if (win.imageAttachment) onUpdate({ imageAttachment: null });
    setSending(true);
    setLiveStatus({ status: 'thinking', detail: null });
    
    try {
      const reply = await sendMessageWithMeta(agent.id, payloadMsgs, { 
        windowId: win.id,
        currentProject,
        onStatusUpdate: (status, detail) => {
          setLiveStatus({ status, detail });
        }
      });
      setMsgs([...displayMsgs, {
        from: 'agent',
        text: reply.text,
        activity: buildActivity(reply),
      }]);
    } catch {
      setMsgs([...displayMsgs, { from: 'agent', text: 'Something went wrong. Try again.' }]);
    }
    setSending(false);
  };

  return {
    agent,
    msgs,
    draft,
    setDraft,
    sending,
    liveStatus,
    showAttach,
    setShowAttach,
    copiedMessage,
    scrollRef,
    copyMessage,
    send,
    imageAttachment: win.imageAttachment,
    onUpdate,
  };
}

function buildActivity(reply) {
  const timings = reply?.timings;
  const tools = reply?.tools || [];
  if (!timings && tools.length === 0) return null;
  return {
    totalMs: timings?.total_ms,
    modelMs: timings?.model_ms,
    setupMs: timings?.setup_ms,
    toolMs: timings?.tool_ms,
    rounds: timings?.model_calls?.length || 0,
    tools: tools.map(t => ({
      name: t.tool,
      ms: t.ms,
      resultChars: t.result_chars,
      round: t.round,
    })),
  };
}
