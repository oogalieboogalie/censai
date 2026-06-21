import React from 'react';
import { WindowTitle } from './Windows.jsx';
import { useChat } from './chat/useChat.js';
import { ChatBubble } from './chat/ChatBubble.jsx';
import { ChatStatus } from './chat/ChatStatus.jsx';
import { ChatInput } from './chat/ChatInput.jsx';
import { RelatedContext } from './doc/RelatedContext.jsx';

export function ChatWindow({ win, onUpdate, allWins, canvasGroups, currentProject, isActive, workspaceId }) {
  const {
    agent,
    msgs,
    draft,
    setDraft,
    sending,
    liveStatus,
    activityLog,
    showAttach,
    setShowAttach,
    copiedMessage,
    scrollRef,
    copyMessage,
    send,
    imageAttachment,
  } = useChat({ win, onUpdate, allWins, canvasGroups, currentProject, isActive });

  return (
    <>
      <WindowTitle 
        agent={agent} 
        label={agent.name} 
        subtitle={agent.role} 
        attachedAgentIds={win.attachedAgents} 
        onDetach={(id) => onUpdate({ attachedAgents: (win.attachedAgents || []).filter(a => a !== id) })} 
      />
      <div 
        ref={scrollRef} 
        style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}
      >
        {msgs.map((m, i) => (
          <ChatBubble
            key={i}
            message={m}
            index={i}
            copied={copiedMessage === i}
            onCopy={copyMessage}
          />
        ))}
        {sending && <ChatStatus liveStatus={liveStatus} agent={agent} activityLog={activityLog} />}
        <RelatedContext workspaceId={workspaceId} query={msgs[msgs.length - 1]?.content || ''} />
      </div>
      <ChatInput
        draft={draft}
        setDraft={setDraft}
        sending={sending}
        send={send}
        showAttach={showAttach}
        setShowAttach={setShowAttach}
        imageAttachment={imageAttachment}
        onUpdate={onUpdate}
      />
    </>
  );
}
