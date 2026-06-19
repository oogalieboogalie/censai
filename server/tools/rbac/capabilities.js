/**
 * Capability Catalog mapping capabilities to specific tools.
 * Capabilities are managed via the Exo-Skeleton Builder in the UI
 * and persisted in the `agent_capabilities` database table.
 */
export const CAPABILITY_TO_TOOLS = {
  'browser.use': ['web_search'],
  'browser.read': ['web_search'],

  'github.read': ['pr_status', 'pr_comments', 'jules_status', 'jules_list', 'local_git_status'],
  'github.write': [
    'submit_pr',
    'merge_pr',
    'jules_submit',
    'local_git_checkpoint',
    'local_git_fetch',
    'local_git_pull_ff_only',
    'local_git_verify',
  ],

  'files.read': ['project_read', 'project_list', 'project_file_outline', 'read_brief', 'scratchpad_read'],
  'files.write': [
    'project_write',
    'project_edit',
    'project_multi_edit',
    'refresh_brief',
    'scratchpad_write',
    'scratchpad_clear',
  ],

  'calendar.read': ['read_calendar', 'sheets_read_range'],
  'calendar.write': ['read_calendar', 'add_calendar_event', 'sheets_read_range', 'sheets_append_row', 'sheets_update_cell'],

  'terminal.suggest': ['run_tests', 'run_linter', 'http_test', 'analyze_deps'],
  'terminal.execute': ['run_tests', 'run_linter', 'sandbox_exec', 'terminal_run', 'http_test', 'analyze_deps'],

  'deploy.read': ['container_status', 'container_logs'],
  'deploy.execute': [
    'container_status',
    'container_logs',
    'restart_service',
    'mailcow_domains',
    'mailcow_mailboxes',
    'mailcow_aliases',
    'mailcow_queue',
    'mailcow_add_mailbox',
    'mailcow_delete_mailbox',
    'mailcow_add_alias',
    'mailcow_delete_alias',
  ],

  'memory.read': ['recall', 'read_journal', 'read_journal_search', 'query_knowledge', 'read_messages', 'read_associations'],
  'memory.write': ['remember', 'remember_important', 'journal', 'know', 'nugget', 'associate', 'feeling', 'message_to', 'broadcast'],
};
