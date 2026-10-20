import { describe, expect, test } from 'bun:test';

import { eventLinksChanged, toEventLinkInputs } from '../src/modules/email/lib/event-modal-links';
import {
  canLookUpThread,
  emailDateLabel,
  emailsAdded,
  mergeThreadRecords,
  recordRowParts,
  splitRecordLabel,
  threadLookupKey,
  threadRecordOf,
} from '../src/modules/email/lib/record-links';
import {
  taskEmailsOf,
  taskRecordsOf,
  toLinkedRecords,
  toTaskEmailReferences,
  toTaskEntityLinks,
} from '../src/modules/tasks/lib/task-record-links';

/** elli-ui#1379: the emails and records the task and event modals link to. */

describe('a record row', () => {
  test('reads its number apart from its name', () => {
    expect(splitRecordLabel('PO-55310 - Halden Steel')).toEqual({
      code: 'PO-55310',
      name: 'Halden Steel',
    });
    expect(splitRecordLabel('30000 - PS 082K')).toEqual({ code: '30000', name: 'PS 082K' });
    expect(splitRecordLabel('PO-55310')).toEqual({ code: null, name: 'PO-55310' });
  });

  test('says so when its record is gone, rather than drawing nothing', () => {
    expect(splitRecordLabel(null)).toEqual({ code: null, name: 'Deleted record' });
  });
});

describe('an email card', () => {
  const now = new Date(2026, 9, 12);
  test('dates the mail, with the year only when it is another', () => {
    expect(emailDateLabel('2026-10-09T10:00:00.000Z', now)).toBe('9 Oct');
    expect(emailDateLabel('2025-12-30T10:00:00.000Z', now)).toBe('30 Dec 2025');
    expect(emailDateLabel(null, now)).toBeNull();
  });
});

describe("an event's links in the modal", () => {
  const email = (providerId: string) => ({ accountId: 'acc', providerId });
  const record = (entityId: string) => ({
    entityType: 'purchaseOrder' as const,
    entityId,
    label: null,
    meta: null,
  });

  test('count as changed only when the set changes, not the order', () => {
    const saved = { emails: [email('a'), email('b')], records: [record('1')] };
    expect(
      eventLinksChanged(saved, { emails: [email('b'), email('a')], records: [record('1')] })
    ).toBe(false);
    expect(eventLinksChanged(saved, { emails: [email('a')], records: [record('1')] })).toBe(true);
    expect(eventLinksChanged(saved, { emails: saved.emails, records: [] })).toBe(true);
  });

  test('send records by type and id only', () => {
    expect(toEventLinkInputs({ emails: [], records: [record('9')] }).recordLinks).toEqual([
      { entityType: 'purchaseOrder', entityId: '9' },
    ]);
  });
});

describe("a task's links in the modal", () => {
  test('round-trip without losing the thread', () => {
    const references = [
      {
        accountId: 'acc',
        providerId: 'm1',
        conversationKey: 'c1',
        threadId: 't1',
        subject: 'Quote',
        fromEmail: 'a@b.co',
      },
    ];
    expect(toTaskEmailReferences(taskEmailsOf(references))).toEqual(references);
  });

  test('keep a record’s name to show and send only its type and id', () => {
    const links = [
      { entityType: 'rfq' as const, entityId: 'r1', label: 'RFQ-1 - Drywall', meta: null },
    ];
    expect(taskRecordsOf(links)[0]!.label).toBe('RFQ-1 - Drywall');
    expect(toTaskEntityLinks(taskRecordsOf(links))).toEqual([
      { entityType: 'rfq', entityId: 'r1' },
    ]);
  });

  test('the search drops what is not a record, like "Other"', () => {
    expect(
      toLinkedRecords([
        { entityType: null, entityId: null, label: 'Other', meta: null },
        { entityType: 'project', entityId: 'p1', label: '30000 - PS 082K', meta: 'Active' },
      ])
    ).toEqual([
      { entityType: 'project', entityId: 'p1', label: '30000 - PS 082K', meta: 'Active' },
    ]);
  });
});

describe('bringing a linked email’s own items along', () => {
  const quote = {
    accountId: 'acc-1',
    providerId: 'm1',
    conversationKey: 'conv-quote',
    threadId: 't1',
  };
  const found = (
    entityType: 'project' | 'rfq',
    entityId: string,
    conversationKey = 'conv-quote'
  ) => ({
    accountId: 'acc-1',
    conversationKey,
    threadId: 't1',
    entityType,
    entityId,
    label: `${entityId} - name`,
    meta: null,
  });

  test('adds the thread’s records after the ones already linked', () => {
    const current = [{ entityType: 'rfq' as const, entityId: 'r0', label: 'r0', meta: null }];
    const merged = mergeThreadRecords(current, [found('project', 'p1')], [quote]);
    expect(merged.map((record) => record.entityId)).toEqual(['r0', 'p1']);
  });

  test('never adds a record twice, from the list or from two emails', () => {
    const current = [{ entityType: 'project' as const, entityId: 'p1', label: 'p1', meta: null }];
    const second = { ...quote, providerId: 'm2', conversationKey: 'conv-po' };
    const merged = mergeThreadRecords(
      current,
      [found('project', 'p1'), found('rfq', 'r1'), found('rfq', 'r1', 'conv-po')],
      [quote, second]
    );
    expect(merged.map((record) => record.entityId)).toEqual(['p1', 'r1']);
  });

  test('skips records of an email unlinked while the lookup ran', () => {
    expect(mergeThreadRecords([], [found('project', 'p1')], [])).toEqual([]);
  });

  test('a record of the same id on another mailbox’s thread is not this email’s', () => {
    const other = { ...found('project', 'p1'), accountId: 'acc-2' };
    expect(mergeThreadRecords([], [other], [quote])).toEqual([]);
  });

  test('matches by thread id when the email has no conversation key', () => {
    const bare = { accountId: 'acc-1', providerId: 'm3', conversationKey: null, threadId: 't1' };
    expect(threadRecordOf(bare, found('project', 'p1', 'whatever'))).toBe(true);
    expect(threadLookupKey(bare)).toBe('acc-1:thread:t1');
  });

  test('an email with neither key cannot be looked up', () => {
    expect(canLookUpThread({ accountId: 'a', providerId: 'm' })).toBe(false);
  });

  test('only the emails new to the list are looked up', () => {
    const second = { ...quote, providerId: 'm2' };
    expect(emailsAdded([quote, second], [quote])).toEqual([second]);
  });
});

describe('a linked-item row', () => {
  test('an invoice named only by its number reads the number as its code', () => {
    expect(recordRowParts({ label: '25321-INV-001', meta: '28100-25 - Brooklyn' })).toEqual({
      code: '25321-INV-001',
      name: '28100-25 - Brooklyn',
    });
  });

  test('a record with a code and a name is split as before', () => {
    expect(recordRowParts({ label: 'PO-55310 - Halden Steel', meta: 'PS 105X' })).toEqual({
      code: 'PO-55310',
      name: 'Halden Steel',
    });
  });

  test('a lone number without a project stays the name', () => {
    expect(recordRowParts({ label: '25321-INV-001', meta: null })).toEqual({
      code: null,
      name: '25321-INV-001',
    });
  });
});
