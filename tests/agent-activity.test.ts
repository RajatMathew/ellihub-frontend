import type { UIMessage } from 'ai';
import { describe, expect, test } from 'bun:test';

import {
  getActivitySteps,
  groupActivitySteps,
  labelLookupItem,
  lookupResultItems,
  summarizeActivity,
  toActivityStep,
} from '../src/mock/agent-activity';

const assistant = (parts: unknown[]): UIMessage =>
  ({ id: 'm1', role: 'assistant', parts }) as unknown as UIMessage;

describe('Elliot activity steps', () => {
  test('a lookup in flight says what it is doing', () => {
    const step = toActivityStep({
      type: 'tool-lookupRfqs',
      toolCallId: 'c1',
      state: 'input-available',
      input: { query: 'drywall' },
    });
    expect(step).toMatchObject({
      id: 'c1',
      status: 'running',
      title: 'Searching RFQs',
      query: 'drywall',
      items: [],
    });
  });

  test('a finished lookup says what it found, with each row labelled', () => {
    const step = toActivityStep({
      type: 'tool-lookupRfqs',
      toolCallId: 'c1',
      state: 'output-available',
      output: {
        rfqs: [
          { id: 'a', rfqNumber: 'RFQ-104', title: 'Drywall package' },
          { id: 'b', rfqNumber: 'RFQ-105', title: 'Ceilings' },
        ],
      },
    });
    expect(step?.status).toBe('done');
    expect(step?.title).toBe('Found 2 RFQs');
    expect(step?.items).toEqual(['RFQ-104 · Drywall package', 'RFQ-105 · Ceilings']);
  });

  test('singular and empty results read naturally', () => {
    const one = toActivityStep({
      type: 'tool-lookupProjects',
      toolCallId: 'p',
      state: 'output-available',
      output: { projects: [{ id: '1', name: 'Hudson Yards', jobNumber: 'J-22' }] },
    });
    expect(one?.title).toBe('Found 1 project');
    expect(one?.items).toEqual(['J-22 · Hudson Yards']);

    const none = toActivityStep({
      type: 'tool-lookupInvoices',
      toolCallId: 'i',
      state: 'output-available',
      output: { invoices: [] },
    });
    expect(none?.title).toBe('No invoices found');
  });

  test('a failed lookup is shown as failed, not as still running', () => {
    const step = toActivityStep({
      type: 'tool-lookupVendors',
      toolCallId: 'v',
      state: 'output-error',
    });
    expect(step).toMatchObject({ status: 'error', title: 'Searching vendors failed' });
  });

  test('proposal tools are cards, never steps', () => {
    for (const tool of [
      'proposeEmailAction',
      'proposeProjectScheduleAction',
      'proposeUploadRfqQuote',
      'proposeRecordAction',
    ]) {
      expect(toActivityStep({ type: `tool-${tool}`, toolCallId: 'x' })).toBeNull();
    }
    expect(toActivityStep({ type: 'text' })).toBeNull();
  });

  test('the mailbox lookup reads as emails, labelled by subject', () => {
    const step = toActivityStep({
      type: 'tool-lookupMailboxMessages',
      toolCallId: 'm',
      state: 'output-available',
      output: {
        mailboxOpen: true,
        total: 2,
        messages: [
          { messageId: 'a', subject: 'Weekly digest' },
          { messageId: 'b', subject: 'Invoice 4471' },
        ],
      },
    });
    expect(step).toMatchObject({
      kind: 'mail',
      title: 'Found 2 emails',
      items: ['Weekly digest', 'Invoice 4471'],
    });
  });

  test('a lookup this client does not know still shows up', () => {
    const step = toActivityStep({
      type: 'tool-lookupSomethingNew',
      toolCallId: 'n',
      state: 'output-available',
      output: { things: [{ name: 'A' }] },
    });
    expect(step).toMatchObject({ status: 'done', title: 'Found 1 result', items: ['A'] });
  });

  test('reads the deliverables list beside the RFQ object', () => {
    // lookupRfqDeliverables answers { rfq: {...}, deliverables: [...] }.
    expect(lookupResultItems({ rfq: { id: 'r' }, deliverables: [{ title: 'Studs' }] })).toEqual([
      { title: 'Studs' },
    ]);
    expect(lookupResultItems('SUCCESS')).toEqual([]);
    expect(lookupResultItems(null)).toEqual([]);
  });

  test('labels attachments, catalog options and bare strings', () => {
    expect(labelLookupItem({ attachmentId: 'a', name: 'quote.pdf' })).toBe('quote.pdf');
    expect(labelLookupItem({ id: 'u', label: 'EA' })).toBe('EA');
    expect(labelLookupItem('Loose')).toBe('Loose');
    expect(labelLookupItem({ id: 'only-an-id' })).toBeNull();
  });

  test('collects a turn’s steps in order and ignores user messages', () => {
    const message = assistant([
      { type: 'step-start' },
      {
        type: 'tool-lookupProjects',
        toolCallId: 'a',
        state: 'output-available',
        output: { projects: [] },
      },
      { type: 'text', text: 'Checking…' },
      { type: 'tool-lookupRfqs', toolCallId: 'b', state: 'input-streaming' },
      { type: 'tool-proposeRecordAction', toolCallId: 'c', state: 'input-available' },
    ]);
    expect(getActivitySteps(message).map((step) => [step.id, step.status])).toEqual([
      ['a', 'done'],
      ['b', 'running'],
    ]);
    expect(getActivitySteps({ ...message, role: 'user' })).toEqual([]);
  });

  test('summarizes a finished turn in one short line', () => {
    const steps = getActivitySteps(
      assistant([
        {
          type: 'tool-lookupProjects',
          toolCallId: 'a',
          state: 'output-available',
          output: { projects: [{ name: 'A' }, { name: 'B' }] },
        },
        {
          type: 'tool-lookupInvoices',
          toolCallId: 'b',
          state: 'output-available',
          output: { invoices: [] },
        },
      ])
    );
    expect(summarizeActivity(steps)).toBe('2 steps · 2 results');
    expect(summarizeActivity(steps.slice(1))).toBe('1 step');
  });
});

describe('Elliot activity runs (elli-ui#1368)', () => {
  const lookup = (id: string) => ({
    type: 'tool-lookupRfqs',
    toolCallId: id,
    state: 'output-available',
    output: { rfqs: [] },
  });
  const text = (value: string) => ({ type: 'text', text: value });
  const ids = (message: UIMessage, hidden?: Set<number>) =>
    groupActivitySteps(message, hidden).map((group) => group.steps.map((step) => step.id));

  test('words between lookups split them into separate timelines', () => {
    const message = assistant([
      text('Let me find the RFQ.'),
      lookup('a'),
      { type: 'step-start' },
      lookup('b'),
      text('Nothing by that number. Let me try the project.'),
      lookup('c'),
    ]);
    expect(ids(message)).toEqual([['a', 'b'], ['c']]);
  });

  test('only the run the turn is still in is trailing', () => {
    const groups = groupActivitySteps(assistant([lookup('a'), text('Broadening.'), lookup('b')]));
    expect(groups.map((group) => group.trailing)).toEqual([false, true]);
  });

  test('a proposal card ends a run, so the run before it is not trailing', () => {
    const groups = groupActivitySteps(
      assistant([lookup('a'), { type: 'tool-proposeRecordAction', toolCallId: 'p' }])
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]!.trailing).toBe(false);
  });

  test('blank or hidden text does not split a run', () => {
    const message = assistant([lookup('a'), text('  '), lookup('b'), text('Done.'), lookup('c')]);
    expect(ids(message)).toEqual([['a', 'b'], ['c']]);
    expect(ids(message, new Set([3]))).toEqual([['a', 'b', 'c']]);
  });
});
