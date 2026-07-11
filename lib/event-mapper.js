function addOneDay(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function buildEventBody(issue) {
  const identifier = issue.identifier ?? '';
  const title = issue.title ?? '(제목 없음)';
  const summary = identifier ? `[${identifier}] ${title}` : title;

  const lines = [];
  if (issue.url) lines.push(issue.url);
  if (issue.state?.name) lines.push(`State: ${issue.state.name}`);
  if (issue.assignee?.name) lines.push(`Assignee: ${issue.assignee.name}`);
  if (issue.priorityLabel) lines.push(`Priority: ${issue.priorityLabel}`);

  return {
    summary,
    description: lines.join('\n'),
    start: { date: issue.dueDate },
    end: { date: addOneDay(issue.dueDate) },
    extendedProperties: {
      private: {
        linearIssueId: issue.id,
      },
    },
  };
}
