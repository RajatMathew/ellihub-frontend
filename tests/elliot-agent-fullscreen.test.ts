import { describe, expect, test } from 'bun:test';

import { compactBody, withThreadBodies } from '../src/mock/agent-context-rules';
import {
  agentLayoutFlags,
  fillAllEmailsPrompt,
  fillEmailPrompt,
  groupConversationsByDay,
} from '../src/mock/agent-fullscreen-rules';

describe('what the mailbox does around the Elliot panel', () => {
  test('a closed panel asks nothing of the mailbox', () => {
    expect(agentLayoutFlags({ open: false, width: 900, fullscreen: true })).toEqual({
      pushesContent: false,
      hidesEmailList: false,
    });
  });

  test('the default panel floats; the wide one pushes and hides the list', () => {
    expect(agentLayoutFlags({ open: true, width: 392, fullscreen: false })).toEqual({
      pushesContent: false,
      hidesEmailList: false,
    });
    expect(agentLayoutFlags({ open: true, width: 640, fullscreen: false })).toEqual({
      pushesContent: true,
      hidesEmailList: true,
    });
  });

  test('full screen covers the mailbox: nothing is pushed, the list is hidden', () => {
    // Width is whatever the side panel was last dragged to; it must not matter.
    expect(agentLayoutFlags({ open: true, width: 392, fullscreen: true })).toEqual({
      pushesContent: false,
      hidesEmailList: true,
    });
  });
});

describe('chats in the full-screen rail', () => {
  // The suite runs on a New York clock (tests/setup-time-zone.ts).
  const now = new Date('2026-10-09T15:00:00-04:00');
  const chat = (id: string, updatedAt: string) => ({ id, updatedAt });

  test('groups by the day they were last touched, newest first', () => {
    const groups = groupConversationsByDay(
      [
        chat('old', '2026-10-01T12:00:00Z'),
        chat('this-morning', '2026-10-09T13:00:00Z'),
        chat('yesterday', '2026-10-08T20:00:00Z'),
        chat('just-now', '2026-10-09T18:30:00Z'),
      ],
      now
    );

    expect(groups.map((group) => [group.label, group.items.map((item) => item.id)])).toEqual([
      ['Today', ['just-now', 'this-morning']],
      ['Yesterday', ['yesterday']],
      ['Earlier', ['old']],
    ]);
  });

  test("a chat from late last night is yesterday in the viewer's day, not UTC's", () => {
    // 11:30 PM Oct 8 in New York is 03:30 Oct 9 UTC.
    const groups = groupConversationsByDay([chat('late', '2026-10-09T03:30:00Z')], now);

    expect(groups).toEqual([{ label: 'Yesterday', items: [chat('late', '2026-10-09T03:30:00Z')] }]);
  });

  test('leaves out days with nothing in them', () => {
    expect(groupConversationsByDay([chat('a', '2026-10-09T18:00:00Z')], now)).toHaveLength(1);
    expect(groupConversationsByDay([], now)).toEqual([]);
  });
});

describe('threads added to the chat', () => {
  const threads = [
    { messageId: 'm1', subject: 'Final quote Q-2291', preview: 'Hi Sarah, Please find our final…' },
    { messageId: 'm2', subject: 'Shop drawings', preview: 'Attached are…' },
  ];

  test('carry their full message once it has loaded, not only the preview', () => {
    const [quote, drawings] = withThreadBodies(
      threads,
      new Map([
        ['m1', { status: 'loaded' as const, body: ['Hi Sarah,', 'Quoted amount: $48,250.00'] }],
        ['m2', { status: 'loading' as const }],
      ])
    );

    // Loaded bodies go out compacted: one block of text, markup stripped.
    expect(quote).toMatchObject({ body: ['Hi Sarah,\nQuoted amount: $48,250.00'] });
    expect(quote.preview).toBe('Hi Sarah, Please find our final…');
    expect(drawings).toMatchObject({ bodyStatus: 'loading' });
    expect(drawings.body).toBeUndefined();
  });

  test('say when a body could not be fetched, and leave unknown threads alone', () => {
    const [quote, drawings] = withThreadBodies(
      threads,
      new Map([['m1', { status: 'error' as const }]])
    );

    expect(quote).toMatchObject({ bodyStatus: 'unavailable' });
    expect(drawings).toEqual(threads[1]);
  });
});

describe('an action from the rail', () => {
  const quote = {
    id: 'row-2',
    messageId: 'AQQkADAw',
    subject: 'Final quote Q-2291',
    senderName: 'Dana Ruiz',
  };

  test('says "this email" when there is only one thread to mean', () => {
    expect(fillEmailPrompt('Create an RFQ from {email}.')).toBe('Create an RFQ from this email.');
  });

  test('names the thread the user picked when several are in context', () => {
    expect(fillEmailPrompt('Add the quote in {email} to its RFQ.', quote)).toBe(
      'Add the quote in the email "Final quote Q-2291" from Dana Ruiz (message AQQkADAw) to its RFQ.'
    );
    expect(fillEmailPrompt('Draft a reply to {email}.', { ...quote, subject: '' })).toContain(
      '"(no subject)"'
    );
  });
});

describe('a typed request for every thread in context', () => {
  test('names each thread and asks for all of them, so none is skipped', () => {
    const prompt = fillAllEmailsPrompt('archive', [
      { id: 'a', messageId: 'm1', subject: 'Declined: test', senderName: 'Akash Patel' },
      { id: 'b', messageId: 'm2', subject: '', senderName: 'Microsoft Azure' },
    ]);
    expect(prompt).toBe(
      'archive — do this for each of these 2 emails, not just one: "Declined: test" from Akash Patel (message m1); "(no subject)" from Microsoft Azure (message m2).'
    );
  });
});

describe('a message body as Elliot reads it', () => {
  test('is text, not markup, and keeps line breaks that mean something', () => {
    expect(
      compactBody([
        '<div><p>Hi Sarah,</p><p>Quoted amount: <b>$48,250</b></p><style>p{}</style></div>',
      ])
    ).toEqual(['Hi Sarah,\nQuoted amount: $48,250']);
  });

  test('is trimmed so four threads fit the server budget', () => {
    const [body] = compactBody(['x'.repeat(10_000)], 100);
    expect(body).toHaveLength(100 + '\n[message trimmed]'.length);
    expect(body!.endsWith('[message trimmed]')).toBe(true);
  });

  test('an empty or tag-only body stays empty, so the thread reads as having none', () => {
    expect(compactBody(['<div></div>'])).toEqual([]);
  });
});
