import { describe, expect, test } from 'bun:test';

import {
  matchesWords,
  mentionCandidates,
  mentionMenuHeading,
  mentionMenuRows,
  mentionTabSearches,
  mentionTitle,
  nextMentionTab,
  parseRecordMentions,
  readMentions,
  readRecordMentions,
  recordMentionKey,
  withMentionedRecords,
  withRecordMention,
  type RecordMention,
} from '../src/mock/agent-mentions';

const quote = { id: 'a', messageId: 'm-a', subject: 'Quote Q-2291', senderName: 'Hudson Millwork' };

describe('mails pointed at with @', () => {
  test('a sent message keeps its mentions, and anything else reads as none', () => {
    expect(readMentions({ mentions: [quote] })).toEqual([{ ...quote }]);
    expect(readMentions(undefined)).toEqual([]);
    expect(readMentions({ mentions: [{ subject: 'no id' }] })).toEqual([]);
  });

  test('two mails with one subject get different tooltips', () => {
    const first = mentionTitle({ ...quote, receivedAt: '2026-10-08T15:00:00.000Z' });
    const second = mentionTitle({ ...quote, receivedAt: '2026-10-09T15:00:00.000Z' });
    expect(first).not.toBe(second);
    expect(first).toContain('Hudson Millwork');
  });
});

const loaded = (id: string, subject: string, extra: Record<string, string> = {}) => ({
  id,
  providerId: `p-${id}`,
  conversationKey: `c-${id}`,
  subject,
  senderName: 'Hudson Millwork',
  senderEmail: 'sales@hudson.example',
  preview: '',
  ...extra,
});
const found = (providerId: string, subject: string, conversationKey = `c-${providerId}`) => ({
  providerId,
  conversationKey,
  subject,
  senderName: 'Studio Lane',
  senderEmail: 'mark@studiolane.example',
  preview: '',
});

describe('what the @ menu offers', () => {
  test('with nothing typed it lists the loaded mail, more than six of it', () => {
    const local = Array.from({ length: 30 }, (_, index) => loaded(String(index), `Mail ${index}`));
    const items = mentionCandidates('', local, []);
    expect(items.length).toBe(20);
    expect(items.every((item) => item.kind === 'local')).toBe(true);
  });

  test('a term shows loaded matches first, then mailbox search results', () => {
    const items = mentionCandidates(
      'quote',
      [loaded('a', 'Quote Q-2291'), loaded('b', 'Lunch')],
      [found('x', 'Old quote from March')]
    );
    expect(items.map((item) => item.key)).toEqual(['local:a', 'hit:x']);
  });

  test('a search result for a thread already listed is not shown twice', () => {
    const items = mentionCandidates(
      'quote',
      [loaded('a', 'Quote Q-2291')],
      [found('p-a', 'Quote Q-2291'), found('y', 'Quote reply', 'c-a'), found('z', 'Other quote')]
    );
    expect(items.map((item) => item.key)).toEqual(['local:a', 'hit:z']);
  });
});

describe('searching the @ menu', () => {
  test('several words match in any order', () => {
    expect(matchesWords('quote final', 'Final quote Q-2291 – Reception millwork')).toBe(true);
    expect(matchesWords('final invoice', 'Final quote Q-2291')).toBe(false);
  });

  test('a word matches the start of a word, not the middle of one', () => {
    expect(matchesWords('hi', 'Hi Sarah, please find')).toBe(true);
    expect(matchesWords('hi', 'Akash has accepted this')).toBe(false);
  });

  test('numbers inside codes match on their own', () => {
    expect(matchesWords('2291', 'Final quote Q-2291')).toBe(true);
    expect(matchesWords('rfq 0142', 'RFQ-0142 Millwork')).toBe(true);
  });
});

const po: RecordMention = {
  kind: 'purchaseOrder',
  id: 'po000001',
  label: 'PO-1042',
  detail: 'Acme Drywall · Hudson Yards',
  status: 'ISSUED',
  projectId: 'proj0001',
  projectName: 'Hudson Yards',
};
const rfq: RecordMention = {
  kind: 'rfq',
  id: 'rfq00001',
  label: 'RFQ-0042',
  detail: 'Drywall',
  status: 'PUBLISHED',
  projectId: 'proj0001',
  projectName: 'Hudson Yards',
};

describe('records pointed at with @', () => {
  test('the search answer keeps known kinds and drops a row of a kind this client lacks', () => {
    const records = parseRecordMentions({
      records: [po, { ...rfq, kind: 'drawing' }, { kind: 'invoice' }],
    });
    expect(records).toEqual([po]);
    expect(parseRecordMentions(null)).toEqual([]);
  });

  test('tagging the same record twice keeps one pill', () => {
    expect(withRecordMention(withRecordMention([], po), { ...po })).toEqual([po]);
  });

  test('an RFQ and a PO sharing an id are still two records', () => {
    expect(recordMentionKey(po)).not.toBe(recordMentionKey({ ...rfq, id: po.id }));
  });

  test('a sent message keeps its records alongside its mails, and reads none from anything else', () => {
    const mail = { id: 'a', messageId: 'm-a', subject: 'Quote', senderName: 'Acme' };
    const metadata = { mentions: [mail], records: [po] };
    expect(readRecordMentions(metadata)).toEqual([po]);
    expect(readMentions(metadata)).toEqual([mail]);
    // A message tagging only records still has no mails, not a parse failure.
    expect(readMentions({ records: [po] })).toEqual([]);
    expect(readRecordMentions({ mentions: [mail] })).toEqual([]);
  });

  test('Elliot is handed the kind and id first in the context, and nothing changes without tags', () => {
    const context = { activeThread: null, today: '2026-10-12' };
    expect(withMentionedRecords([], context)).toBe(context);
    const sent = withMentionedRecords([po], context);
    expect(Object.keys(sent)[0]).toBe('mentionedRecordsInLatestMessage');
    expect(sent).toMatchObject({
      mentionedRecordsInLatestMessage: [
        { kind: 'purchaseOrder', id: 'po000001', label: 'PO-1042', projectId: 'proj0001' },
      ],
      today: '2026-10-12',
    });
  });
});

describe('the @ menu tabs', () => {
  test('opens on mail; Tab walks forward and Shift+Tab back, wrapping at both ends', () => {
    expect(nextMentionTab('mail', 1)).toBe('project');
    expect(nextMentionTab('invoice', 1)).toBe('mail');
    expect(nextMentionTab('mail', -1)).toBe('invoice');
  });

  test('a record tab asks for that kind alone and leaves the mailbox unsearched', () => {
    expect(mentionTabSearches('purchaseOrder')).toEqual({
      mail: false,
      recordKind: 'purchaseOrder',
    });
    expect(mentionTabSearches('mail')).toEqual({ mail: true, recordKind: undefined });
  });

  test('a record tab leaves out a record already tagged, and repeats no heading', () => {
    const rows = mentionMenuRows([], [rfq, po], new Set([recordMentionKey(po)]));
    expect(rows.map((row) => row.key)).toEqual(['record:rfq:rfq00001']);
    expect(mentionMenuHeading(rows, 0, 'rfq')).toBeNull();
  });

  test('the mail tab heads loaded mail and mailbox hits separately', () => {
    const local = {
      id: 'a',
      providerId: 'p-a',
      conversationKey: 'c-a',
      subject: 'PO-1042 delivery',
      senderName: 'Acme',
      senderEmail: 'ops@acme.test',
      preview: 'Delivery Friday',
    };
    const found = {
      providerId: 'p-b',
      conversationKey: 'c-b',
      subject: 'PO-1042 invoice',
      senderName: 'Acme',
      senderEmail: 'ar@acme.test',
      preview: 'Invoice attached',
    };
    const rows = mentionMenuRows(mentionCandidates('po-1042', [local], [found]), []);
    expect(rows.map((_, index) => mentionMenuHeading(rows, index, 'mail'))).toEqual([
      'Emails',
      'From your mailbox',
    ]);
  });
});
