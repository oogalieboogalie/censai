export const SHARED_SUB_AGENT_TOOLS = [
  'remember', 'recall', 'journal', 'read_journal', 'read_journal_search',
  'feeling', 'message_to', 'read_messages',
  'project_read', 'project_file_outline', 'project_list', 'read_brief', 'report',
  'task_done',
];

export const SUB_AGENT_TOOL_WHITELIST = {
  worker: [
    ...SHARED_SUB_AGENT_TOOLS,
    'project_write', 'project_edit', 'refresh_brief', 'submit_pr',
    'jules_submit', 'jules_status', 'jules_list',
    'pr_status', 'pr_comments', 'merge_pr',
    'task_done',
  ],
  reviewer: [
    ...SHARED_SUB_AGENT_TOOLS,
    'jules_status', 'jules_list',
    'pr_status', 'pr_comments',
    'task_done',
  ],
  researcher: [
    ...SHARED_SUB_AGENT_TOOLS,
    'web_search',
    'jules_status', 'jules_list',
    'pr_status', 'pr_comments',
    'task_done',
  ],
};

export const AGENT_CLASS_TOOL_WHITELIST = {
  scout: [
    ...SHARED_SUB_AGENT_TOOLS,
    'web_search',
    'analyze_deps',
    'db_inspect',
    'container_status',
    'container_logs',
    'http_test',
    'run_linter',
    'jules_status', 'jules_list',
    'pr_status', 'pr_comments',
    'task_done',
  ],
  builder: [
    ...SHARED_SUB_AGENT_TOOLS,
    'project_write', 'project_edit', 'project_multi_edit', 'refresh_brief', 'submit_pr',
    'jules_submit', 'jules_status', 'jules_list',
    'pr_status', 'pr_comments', 'merge_pr',
    'run_tests', 'run_linter', 'sandbox_exec', 'terminal_run',
    'http_test',
    'task_done',
  ],
  auditor: [
    ...SHARED_SUB_AGENT_TOOLS,
    'web_search',
    'db_inspect',
    'analyze_deps',
    'http_test',
    'run_linter',
    'jules_status', 'jules_list',
    'pr_status', 'pr_comments',
    'task_done',
  ],
  sentry: [
    ...SHARED_SUB_AGENT_TOOLS,
    'container_status', 'container_logs', 'http_test', 'db_inspect', 'web_search', 'task_done',
  ],
};

export const CORE_AGENT_TOOL_WHITELIST = {
  atlas: [
    'remember', 'recall', 'feeling', 'message_to', 'read_messages',
    'list_sub_agents', 'submit_agent_task', 'dispatch_squad', 'squad_status',
    'project_read', 'project_file_outline', 'project_list', 'project_write', 'project_edit', 'project_multi_edit',
    'read_brief', 'refresh_brief', 'report',
    'run_tests', 'run_linter', 'sandbox_exec', 'terminal_run', 'http_test', 'task_done',
    'vex_run', 'vex_status', 'vex_list_agents',
  ],
  censai: [
    'remember', 'recall', 'feeling', 'message_to', 'read_messages',
    'web_search', 'project_read', 'project_file_outline', 'project_list', 'read_brief', 'report'
  ],
  genesis: [
    'remember', 'recall', 'feeling', 'message_to', 'read_messages',
    'list_sub_agents', 'submit_agent_task', 'dispatch_squad', 'squad_status',
    'project_read', 'project_file_outline', 'project_list', 'project_write', 'project_edit',
    'read_brief', 'report', 'generate_image', 'set_canvas_hue',
    'vex_run', 'vex_status', 'vex_list_agents',
  ],
  nexus: [
    'remember', 'recall', 'feeling', 'message_to', 'read_messages',
    'open_project', 'list_projects',
    'project_read', 'project_file_outline', 'project_list', 'project_write', 'project_edit', 'project_multi_edit',
    'read_brief', 'refresh_brief', 'report',
    'create_sub_agent', 'list_sub_agents', 'remove_sub_agent', 'submit_agent_task',
    'scratchpad_write', 'scratchpad_read', 'scratchpad_clear',
    'dispatch_squad', 'squad_status',
    'db_inspect', 'postgres_tool_info', 'postgres_query', 'postgres_exec_file', 'postgres_schema_audit', 'postgres_table_sample',
    'container_status', 'container_logs', 'restart_service',
    'http_test', 'run_tests', 'run_linter', 'sandbox_exec', 'terminal_run', 'analyze_deps',
    'jules_submit', 'jules_status', 'jules_list',
    'pr_status', 'pr_comments', 'submit_pr'
  ],
  foundation: [
    'remember', 'recall', 'feeling', 'message_to', 'read_messages',
    'project_read', 'project_file_outline', 'project_list', 'read_brief', 'report',
    'container_status', 'container_logs', 'restart_service',
    'mailcow_domains', 'mailcow_mailboxes', 'mailcow_aliases', 'mailcow_queue',
    'mailcow_add_mailbox', 'mailcow_delete_mailbox', 'mailcow_add_alias', 'mailcow_delete_alias',
  ],
  architect: [
    'remember', 'recall', 'feeling', 'message_to', 'read_messages',
    'list_sub_agents', 'submit_agent_task',
    'project_read', 'project_file_outline', 'project_list',
    'project_write', 'project_edit', 'project_multi_edit',
    'read_brief', 'refresh_brief', 'report',
    'dispatch_squad', 'squad_status',
    'run_tests', 'run_linter', 'sandbox_exec', 'terminal_run', 'http_test',
    'analyze_deps'
  ],
  echo: [
    'remember', 'recall', 'feeling', 'message_to', 'read_messages',
    'project_read', 'project_file_outline', 'project_list', 'read_brief', 'report',
    'web_search', 'dispatch_squad', 'squad_status',
    'sheets_read_range', 'sheets_append_row', 'sheets_update_cell'
  ],
  guardian: [
    'remember', 'recall', 'feeling', 'message_to', 'read_messages',
    'project_read', 'project_file_outline', 'project_list', 'read_brief', 'report'
  ]
};

export const FULL_TOOL_ACCESS_AGENT_IDS = new Set([]);

export const TASK_SUBMISSION_GATED_TOOLS = [
  'local_git_status',
  'local_git_fetch',
  'local_git_pull_ff_only',
  'local_git_checkpoint',
  'local_git_verify',
];
