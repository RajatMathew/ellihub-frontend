import { describe, expect, test } from 'bun:test';

import type { EmailActivity } from '../src/modules/email/api';
import { emailActionHeaders } from '../src/modules/email/lib/email-action-source';
import {
  activityCalendarEvent,
  activitySummary,
  clubTriageActivity,
  groupActivityByDay,
  groupThreadActivity,
  threadMessageKey,
  triageChips,
} from '../src/modules/email/lib/thread-activity';

// The email activity timeline (elli-ui#1309): where each recorded action is
// drawn, how the feed is grouped, and what a write tells the server about the
// email it was made from. The suite runs on a New York clock.

const NOW = new Date(2026, 9, 8, 12, 0);

const activity = (overrides: Partial<EmailActivity> = {}): EmailActivity => ({
  id: 'a1',
  accountId: 'acct-1',
  accountLabel: 'Procurement',
  providerId: 'msg-1',
  conversationKey: 'conv-1',
  threadSubject: 'Plywood delivery',
  kind: 'action',
  action: 'record',
  summary: 'created RFQ RFQ-0042',
  entityType: 'rfq',
  entityId: 'rfq-1',
  entityLabel: null,
  details: null,
  note: null,
  actor: { type: 'human', userId: 'u1', name: 'Dana Whitfield', image: null },
  agentName: null,
  approvedBy: null,
  createdAt: new Date(2026, 9, 8, 9, 30).toISOString(),
  editedAt: null,
  canEdit: false,
  ...overrides,
});

describe('where an action shows in a thread', () => {
  test('above the email it was done from', () => {
    const { byMessage, threadLevel } = groupThreadActivity([activity()], ['msg-1', 'msg-2']);

    expect(byMessage.get('msg-1')?.map((item) => item.id)).toEqual(['a1']);
    expect(threadLevel).toEqual([]);
  });

  test('at the top, for a note or anything not tied to an email on screen', () => {
    const items = [
      activity({ id: 'note', kind: 'note', providerId: 'msg-1' }),
      activity({ id: 'whole-thread', providerId: null }),
      activity({ id: 'gone', providerId: 'msg-from-before' }),
    ];

    const { threadLevel, byMessage } = groupThreadActivity(items, ['msg-1']);

    expect(threadLevel.map((item) => item.id)).toEqual(['note', 'whole-thread', 'gone']);
    expect(byMessage.size).toBe(0);
  });

  test('a message is matched by its provider id, falling back to its cache id', () => {
    expect(threadMessageKey({ id: 'cache-1', providerId: 'msg-1' })).toBe('msg-1');
    expect(threadMessageKey({ id: 'cache-1' })).toBe('cache-1');
  });
});

describe('the activity feed by day', () => {
  test('heads today, yesterday, then the date', () => {
    const groups = groupActivityByDay(
      [
        activity({ id: 'today', createdAt: new Date(2026, 9, 8, 9).toISOString() }),
        activity({ id: 'yesterday', createdAt: new Date(2026, 9, 7, 18).toISOString() }),
        activity({ id: 'earlier', createdAt: new Date(2026, 9, 1, 8).toISOString() }),
      ],
      NOW
    );

    expect(groups.map((group) => group.label)).toEqual([
      'Today',
      'Yesterday',
      'Thursday, October 1',
    ]);
  });

  test('keeps a late-evening action on the reader’s own day, not the UTC one', () => {
    // 9 pm in New York is already tomorrow in UTC.
    const groups = groupActivityByDay(
      [activity({ createdAt: new Date(2026, 9, 7, 21).toISOString() })],
      NOW
    );

    expect(groups[0]!.label).toBe('Yesterday');
  });
});

describe('what a write tells the server', () => {
  const source = { accountId: 'acct-1', providerId: 'msg-1', conversationKey: 'RE: plywood::x' };
  const proposal = { conversationId: 'chat-1', toolCallId: 'call-1' };

  test('names the open thread, encoded — thread keys carry spaces and colons', () => {
    expect(emailActionHeaders('post', source, null)).toEqual({
      'X-Elli-Source-Account': 'acct-1',
      'X-Elli-Source-Thread': 'RE%3A%20plywood%3A%3Ax',
      'X-Elli-Source-Message': 'msg-1',
    });
  });

  test('names the Elliot proposal being approved', () => {
    expect(emailActionHeaders('patch', null, proposal)).toEqual({
      'X-Elliot-Conversation': 'chat-1',
      'X-Elliot-Tool-Call': 'call-1',
    });
  });

  test('says nothing on a read, so reads stay identical whatever is open', () => {
    expect(emailActionHeaders('get', source, proposal)).toEqual({});
  });

  test('says nothing when no thread is open and nothing is being approved', () => {
    expect(emailActionHeaders('delete', null, null)).toEqual({});
  });
});

describe('triage changes made one after another', () => {
  const at = (minutes: number) => new Date(2026, 9, 8, 9, minutes).toISOString();
  const triage = (id: string, minute: number, changed: string[], overrides = {}) =>
    activity({
      id,
      kind: 'triage',
      action: 'classify',
      createdAt: at(minute),
      details: { status: 'unset', assignee: 'Arthur Morgan', references: [], changed },
      ...overrides,
    });

  test('club the assignee and the court into one line', () => {
    const items = [
      triage('court', 44, ['status'], { summary: 'cleared the court' }),
      triage('assignee', 43, ['assignee'], { summary: 'assigned this thread to Arthur Morgan' }),
    ];

    const clubbed = clubTriageActivity(items);

    expect(clubbed).toHaveLength(1);
    expect(clubbed[0]!.summary).toBe('assigned this thread to Arthur Morgan and cleared the court');
  });

  test('club linked items, and a link undone in the run cancels out', () => {
    const items = [
      triage('unlink', 45, ['references'], { summary: 'unlinked RFQ-2210' }),
      triage('rfq', 44, ['references'], { summary: 'linked RFQ-2210' }),
      triage('project', 43, ['references'], { summary: 'linked 30000 – PS 082K' }),
    ];

    expect(clubTriageActivity(items).map((item) => item.summary)).toEqual([
      'linked 30000 – PS 082K',
    ]);
  });

  test('never club the court with linked items', () => {
    const items = [
      triage('link', 44, ['references'], { summary: 'linked RFQ-2210' }),
      triage('court', 43, ['status'], { summary: 'set the court to Closed' }),
    ];

    expect(clubTriageActivity(items)).toHaveLength(2);
  });

  test('not when they are more than three minutes apart', () => {
    const items = [
      triage('court', 47, ['status'], { summary: 'cleared the court' }),
      triage('assignee', 43, ['assignee'], { summary: 'assigned this thread to Arthur Morgan' }),
    ];

    expect(clubTriageActivity(items)).toHaveLength(2);
  });

  test('not across a note, a task or a different person in between', () => {
    const note = activity({ id: 'note', kind: 'note', action: 'note', createdAt: at(44) });
    const someoneElse = triage('other', 44, ['status'], {
      actor: { type: 'human' as const, userId: 'u2', name: 'Casey Fuller', image: null },
    });

    expect(
      clubTriageActivity([triage('a', 45, ['status']), note, triage('b', 43, ['assignee'])])
    ).toHaveLength(3);
    expect(
      clubTriageActivity([triage('a', 45, ['status']), someoneElse, triage('b', 43, ['assignee'])])
    ).toHaveLength(3);
  });

  test('leave notes, tasks and calendar events as they are, however close together', () => {
    const items = [
      activity({ id: 't1', action: 'task', summary: 'added task A', createdAt: at(44) }),
      activity({ id: 't2', action: 'task', summary: 'added task B', createdAt: at(43) }),
    ];

    expect(clubTriageActivity(items).map((item) => item.id)).toEqual(['t1', 't2']);
  });
});

describe('the chips on a triage line', () => {
  const project = { type: 'project', label: '30000 – PS 082K' };
  const rfq = { type: 'rfq', label: 'RFQ-2025-1630 – MATERIAL REQUEST FORM' };
  const row = (summary: string, changed: string[] | undefined, minute = 30) =>
    activity({
      id: `t${minute}`,
      kind: 'triage',
      action: 'classify',
      summary,
      createdAt: new Date(2026, 9, 8, 9, minute).toISOString(),
      details: { status: 'open', assignee: 'Juan M.', references: [project, rfq], changed },
    });

  test('setting the court shows only the court, not the assignee or links', () => {
    expect(triageChips(row('set the court to Open', ['status']))).toEqual({
      status: 'open',
      assignee: null,
      references: [],
      unlinked: [],
    });
  });

  test('linking shows only the record it linked, not the ones already there', () => {
    expect(
      triageChips(row('linked RFQ-2025-1630 – MATERIAL REQUEST FORM', ['references']))
    ).toEqual({
      status: null,
      assignee: null,
      references: [rfq],
      unlinked: [],
    });
  });

  test('unlinking shows the record that is gone as an unlinked chip, not a linked one', () => {
    expect(triageChips(row('unlinked 30000 – PS 082K', ['references']))).toMatchObject({
      references: [],
      unlinked: ['30000 – PS 082K'],
    });
  });

  test('a line that unlinks several records counts them instead of listing every name', () => {
    const item = row(
      'unlinked 28100-25 – Brooklyn Animal Care Center, 2026-001 – Testing, 30000 – PS 082K',
      ['references']
    );

    expect(activitySummary(item)).toBe('unlinked 3 items');
    expect(triageChips(item).unlinked).toHaveLength(3);
  });

  test('a single record is still named in the sentence', () => {
    expect(activitySummary(row('linked 30000 – PS 082K', ['references']))).toBe(
      'linked 30000 – PS 082K'
    );
  });

  test('a clubbed line that both linked and unlinked counts each', () => {
    const [clubbed] = clubTriageActivity([
      row('unlinked 2026-001 – Testing, 30100 – PS 515X', ['references'], 31),
      row('linked 30000 – PS 082K', ['references'], 30),
    ]);

    expect(activitySummary(clubbed!)).toBe('linked 1 item and unlinked 2 items');
    expect(triageChips(clubbed!).unlinked).toEqual(['2026-001 – Testing', '30100 – PS 515X']);
  });

  test('a court change reads as its own sentence', () => {
    expect(activitySummary(row('set the court to Open', ['status']))).toBe('set the court to Open');
  });

  test('a clubbed links line shows every record the run linked, and nothing else', () => {
    const [clubbed] = clubTriageActivity([
      row('linked RFQ-2025-1630 – MATERIAL REQUEST FORM', ['references'], 31),
      row('linked 30000 – PS 082K', ['references'], 30),
    ]);

    expect(triageChips(clubbed!)).toEqual({
      status: null,
      assignee: null,
      references: [project, rfq],
      unlinked: [],
    });
  });

  test('a row recorded before changes were tracked still shows everything', () => {
    expect(triageChips(row('triaged this email', undefined)).references).toEqual([project, rfq]);
  });
});

describe('an added calendar event in the timeline', () => {
  const link = {
    id: 'link-1',
    calendarId: 'cal-1',
    eventId: 'evt-1',
    eventSubject: 'it works now',
    eventStart: '2026-10-08T00:00:00Z',
    eventEnd: '2026-10-09T00:00:00Z',
    eventIsAllDay: true,
    accountId: 'acct-1',
    providerId: 'msg-1',
    conversationKey: 'conv-1',
    threadId: null,
    subject: 'Re: it works now',
    fromEmail: null,
    createdAt: NOW.toISOString(),
  };
  const added = activity({
    action: 'calendar_event',
    summary: 'added calendar event it works now',
    entityType: 'calendarEvent',
    entityId: 'evt-1',
  });

  const kept = {
    eventStart: '2026-10-08T00:00:00Z',
    eventEnd: '2026-10-09T00:00:00Z',
    eventIsAllDay: true,
  };

  test('is matched to the linked event it made, for its date', () => {
    expect(activityCalendarEvent(added, [link])).toEqual({
      eventSubject: 'it works now',
      eventStart: link.eventStart,
      eventEnd: link.eventEnd,
      eventIsAllDay: true,
      deleted: false,
    });
  });

  test('shows the live event over its own copy, so an edit shows', () => {
    const moved = { ...link, eventStart: '2026-10-12T00:00:00Z' };
    const row = { ...added, details: kept };

    expect(activityCalendarEvent(row, [moved])?.eventStart).toBe('2026-10-12T00:00:00Z');
  });

  test('stays, marked deleted, once the event is deleted', () => {
    const row = {
      ...added,
      entityLabel: 'it works now',
      details: { ...kept, deletedAt: NOW.toISOString() },
    };

    expect(activityCalendarEvent(row, [])).toEqual({
      eventSubject: 'it works now',
      ...kept,
      deleted: true,
    });
  });

  test('stays, not deleted, when only the link was removed', () => {
    const row = { ...added, entityLabel: 'it works now', details: kept };

    expect(activityCalendarEvent(row, [])?.deleted).toBe(false);
  });

  test('keeps its sentence when it was recorded before rows kept the event', () => {
    expect(activityCalendarEvent(added, [{ ...link, eventId: 'evt-2' }])).toBeNull();
    expect(activityCalendarEvent(added, undefined)).toBeNull();
  });

  test('is never matched for a row that is not an added event', () => {
    expect(activityCalendarEvent({ ...added, action: 'record' }, [link])).toBeNull();
  });
});

describe('an added task in the timeline', () => {
  const added = activity({
    action: 'task',
    summary: 'added task soem task',
    entityType: 'task',
    entityId: 'task-1',
  });

  test('leaves the title to the task card drawn beneath it', () => {
    const task = {
      title: 'some task',
      status: 'OPEN' as const,
      priority: 'P3' as const,
      dueAt: null,
      assignee: null,
      deleted: false,
    };

    expect(activitySummary({ ...added, task })).toBe('added a task');
  });

  test('keeps its sentence when the API sends no task', () => {
    expect(activitySummary(added)).toBe('added task soem task');
    expect(activitySummary({ ...added, task: null })).toBe('added task soem task');
  });

  test('an added event reads as such once its card is drawn', () => {
    expect(activitySummary(activity({ action: 'calendar_event' }), true)).toBe(
      'added a calendar event'
    );
  });
});
