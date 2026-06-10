import React from 'react';
import { Icon } from '../Icons.jsx';

export function ChatStatus({ liveStatus, agent }) {
  const display = getLiveStatusDisplay(liveStatus, agent);
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', justifyContent: 'flex-start' }}>
      <div style={{ padding: '8px 12px', borderRadius: 14, background: 'var(--surface-2)', border: '1px solid var(--hairline)', fontSize: 13.5, color: 'var(--ink-soft)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ display: 'flex', alignItems: 'center', color: 'var(--accent-ink)' }}>{display.icon}</span>
        <span style={{ fontSize: 12, fontWeight: 500, transition: 'all 0.2s ease-in-out' }}>{display.label}</span>
        <span style={{ display: 'inline-flex', gap: 3, opacity: 0.7 }}>
          {[0, 1, 2].map(i => <span key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: 'currentColor', animation: `gen-bounce 1.2s ease-in-out ${i * 0.15}s infinite` }} />)}
        </span>
      </div>
    </div>
  );
}

function getLiveStatusDisplay(liveStatus, agent) {
  if (!liveStatus) {
    return {
      label: 'Thinking',
      icon: <Icon.Bot size={13} style={{ animation: 'gen-pulse 1.5s infinite ease-in-out' }} />
    };
  }

  const { status, detail } = liveStatus;

  if (status === 'thinking') {
    return {
      label: 'Thinking',
      icon: <Icon.Bot size={13} style={{ animation: 'gen-pulse 1.5s infinite ease-in-out' }} />
    };
  }

  if (status === 'calling_tool' && detail) {
    const tool = detail.tool;
    let label = `Executing ${tool}...`;
    let icon = <Icon.Tools size={13} style={{ animation: 'gen-pulse 1.5s infinite ease-in-out' }} />;

    if (['remember', 'remember_important'].includes(tool)) {
      label = 'Updating memory pool...';
      icon = <Icon.Memory size={13} style={{ animation: 'gen-pulse 1.5s infinite ease-in-out' }} />;
    } else if (['journal', 'read_journal', 'read_journal_search'].includes(tool)) {
      label = 'Reading personal logs...';
      icon = <Icon.Files size={13} style={{ animation: 'gen-pulse 1.5s infinite ease-in-out' }} />;
    } else if (['recall', 'query_knowledge', 'know', 'associate'].includes(tool)) {
      label = 'Querying association network...';
      icon = <Icon.Memory size={13} style={{ animation: 'gen-pulse 1.5s infinite ease-in-out' }} />;
    } else if (tool === 'web_search') {
      label = 'Searching the web...';
      icon = <Icon.Search size={13} style={{ animation: 'gen-pulse 1.5s infinite ease-in-out' }} />;
    } else if (['github_read_file', 'github_write_file', 'github_list_issues', 'github_create_issue', 'github_comment_issue'].includes(tool)) {
      label = 'Syncing with GitHub...';
      icon = <Icon.Files size={13} style={{ animation: 'gen-pulse 1.5s infinite ease-in-out' }} />;
    } else if (['local_read_file', 'local_write_file'].includes(tool)) {
      if (tool === 'local_read_file') {
        const filename = detail.args?.file_path ? detail.args.file_path.split('/').pop() : '';
        label = filename ? `Reading ${filename}...` : 'Reading local file...';
      } else {
        const filename = detail.args?.file_path ? detail.args.file_path.split('/').pop() : '';
        label = filename ? `Saving ${filename}...` : 'Saving local file...';
      }
      icon = <Icon.Files size={13} style={{ animation: 'gen-pulse 1.5s infinite ease-in-out' }} />;
    } else if (tool === 'local_list_dir') {
      label = 'Scanning workspace...';
      icon = <Icon.Folder size={13} style={{ animation: 'gen-pulse 1.5s infinite ease-in-out' }} />;
    } else if (['create_sub_agent', 'list_sub_agents', 'remove_sub_agent'].includes(tool)) {
      label = 'Summoning specialized sub-agent...';
      icon = <Icon.Bot size={13} style={{ animation: 'gen-pulse 1.5s infinite ease-in-out' }} />;
    } else if (['project_read', 'project_write', 'project_edit', 'project_list', 'project_multi_edit'].includes(tool)) {
      label = ['project_edit', 'project_multi_edit'].includes(tool) ? 'Refactoring project code...' : 'Analyzing project files...';
      icon = <Icon.Tools size={13} style={{ animation: 'gen-pulse 1.5s infinite ease-in-out' }} />;
    } else if (['submit_pr', 'pr_status', 'pr_comments', 'merge_pr'].includes(tool)) {
      label = 'Reviewing pull requests...';
      icon = <Icon.Tools size={13} style={{ animation: 'gen-pulse 1.5s infinite ease-in-out' }} />;
    } else if (['jules_submit', 'jules_status', 'jules_list'].includes(tool)) {
      label = 'Dispatching Jules AI specialist...';
      icon = <Icon.Bot size={13} style={{ animation: 'gen-pulse 1.5s infinite ease-in-out' }} />;
    } else if (['read_calendar', 'add_calendar_event'].includes(tool)) {
      label = 'Consulting Google Calendar...';
      icon = <Icon.Calendar size={13} style={{ animation: 'gen-pulse 1.5s infinite ease-in-out' }} />;
    }

    return { label, icon };
  }

  if (status === 'completed_tool' && detail) {
    return {
      label: `Completed ${detail.tool} in ${detail.ms}ms`,
      icon: <Icon.Check size={13} style={{ color: 'var(--accent)' }} />
    };
  }

  return {
    label: 'Thinking',
    icon: <Icon.Bot size={13} style={{ animation: 'gen-pulse 1.5s infinite ease-in-out' }} />
  };
}
