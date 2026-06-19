export function buildWakePrompt(wake, tasks = []) {
  const isReview = wake.phase === 'review' || tasks.length > 0;
  const lines = [
    `You were woken by a direct family message from ${wake.sender_name} (${wake.sender_id}).`,
    `Message ID: ${wake.message_id}`,
    wake.subject ? `Subject: ${wake.subject}` : null,
    `Message type: ${wake.message_type}`,
    '',
    wake.content,
    '',
  ].filter(v => v !== null);

  if (isReview) {
    lines.push('## Delegated work to review');
    for (const task of tasks) {
      lines.push(`- ${task.title}: ${task.status}`);
      if (task.result) lines.push(`  Result: ${task.result}`);
      if (task.error) lines.push(`  Error: ${task.error}`);
    }
    lines.push(
      '',
      'Review the results critically. If work is incomplete, dispatch corrective work.',
      'If it is satisfactory, produce a concise final report for the original sender.'
    );
  } else if (wake.message_type === 'agent_report') {
    lines.push(
      'This is a report from another agent. Do not reply merely to acknowledge it.',
      'If it enables the next phase, message the appropriate family member or dispatch work. Otherwise finish silently.'
    );
  } else {
    lines.push(
      'Treat this as an actionable request. You may answer directly or delegate to your sub-agents.',
      'When delegating, give concrete acceptance criteria. You will be woken again when all linked tasks finish.'
    );
  }
  return lines.join('\n');
}
