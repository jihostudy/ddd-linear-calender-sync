import { getCalendar, getCalendarId } from './gcal-client.js';
import { buildEventBody } from './event-mapper.js';

async function findEventByIssueId(issueId) {
  const calendar = getCalendar();
  const calendarId = getCalendarId();
  const res = await calendar.events.list({
    calendarId,
    privateExtendedProperty: [`linearIssueId=${issueId}`],
    showDeleted: false,
    maxResults: 5,
    singleEvents: true,
  });
  return res.data.items?.[0] ?? null;
}

async function createEvent(issue) {
  const calendar = getCalendar();
  const calendarId = getCalendarId();
  await calendar.events.insert({
    calendarId,
    requestBody: buildEventBody(issue),
  });
}

async function updateEvent(eventId, issue) {
  const calendar = getCalendar();
  const calendarId = getCalendarId();
  await calendar.events.patch({
    calendarId,
    eventId,
    requestBody: buildEventBody(issue),
  });
}

async function deleteEvent(eventId) {
  const calendar = getCalendar();
  const calendarId = getCalendarId();
  await calendar.events.delete({ calendarId, eventId });
}

export async function handleWebhook(payload) {
  if (payload.type !== 'Issue') {
    return { skipped: 'not an Issue event', type: payload.type };
  }

  const { action, data } = payload;
  const issue = data;
  const issueId = issue?.id;
  if (!issueId) return { skipped: 'no issue id' };

  if (action === 'remove') {
    const existing = await findEventByIssueId(issueId);
    if (existing) {
      await deleteEvent(existing.id);
      return { action: 'deleted', issueId };
    }
    return { action: 'noop-remove', issueId };
  }

  const hasDueDate = Boolean(issue.dueDate);
  const existing = await findEventByIssueId(issueId);

  if (!hasDueDate) {
    if (existing) {
      await deleteEvent(existing.id);
      return { action: 'deleted-no-duedate', issueId };
    }
    return { action: 'noop-no-duedate', issueId };
  }

  if (existing) {
    await updateEvent(existing.id, issue);
    return { action: 'updated', issueId, eventId: existing.id };
  }
  await createEvent(issue);
  return { action: 'created', issueId };
}
