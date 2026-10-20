import type { UIMessage } from 'ai';
import { describe, expect, test } from 'bun:test';

import {
  batchProgress,
  batchTitle,
  findMailProposalBatches,
  summarizeBatch,
  type BatchItemSummary,
} from '../src/mock/agent-proposal-batch';

const assistant = (parts: unknown[]): UIMessage =>
  ({ id: 'a', role: 'assistant', parts }) as unknown as UIMessage;
const mail = (id: string) => ({ type: 'tool-proposeEmailAction', toolCallId: id });

describe('Elliot proposal batches', () => {
  test('groups the mail proposals of one step', () => {
    // "Classify the unread emails": one proposal per destination, one step.
    const message = assistant([
      { type: 'step-start' },
      { type: 'tool-lookupMailboxMessages', toolCallId: 'l', state: 'output-available' },
      { type: 'step-start' },
      { type: 'reasoning', text: 'sorting…' },
      mail('junk'),
      mail('archive'),
      mail('tag'),
    ]);
    expect(findMailProposalBatches(message)).toEqual([['junk', 'archive', 'tag']]);
  });

  test('a single proposal stays a card of its own', () => {
    expect(findMailProposalBatches(assistant([{ type: 'step-start' }, mail('one')]))).toEqual([]);
  });

  test('a proposal in a later step is a follow-up, not part of the batch', () => {
    const message = assistant([
      { type: 'step-start' },
      mail('a'),
      { type: 'step-start' },
      mail('b'),
    ]);
    expect(findMailProposalBatches(message)).toEqual([]);
  });

  test('text between proposals splits them', () => {
    const message = assistant([
      mail('a'),
      mail('b'),
      { type: 'text', text: 'And separately:' },
      mail('c'),
      mail('d'),
    ]);
    expect(findMailProposalBatches(message)).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  test('blank text and reasoning do not split them', () => {
    const message = assistant([
      mail('a'),
      { type: 'text', text: '  \n' },
      { type: 'reasoning', text: '…' },
      mail('b'),
    ]);
    expect(findMailProposalBatches(message)).toEqual([['a', 'b']]);
  });

  test('another kind of card ends the run', () => {
    const message = assistant([
      mail('a'),
      { type: 'tool-proposeRecordAction', toolCallId: 'r' },
      mail('b'),
    ]);
    expect(findMailProposalBatches(message)).toEqual([]);
  });

  test('user messages never batch', () => {
    const message = { id: 'u', role: 'user', parts: [mail('a'), mail('b')] };
    expect(findMailProposalBatches(message as unknown as UIMessage)).toEqual([]);
  });
});

const item = (status: BatchItemSummary['status'], ...messageIds: string[]): BatchItemSummary => ({
  status,
  messageIds,
});

describe('Elliot proposal batch summary', () => {
  test('counts distinct emails across the changes', () => {
    const summary = summarizeBatch([
      item('pending', 'm1', 'm2', 'm3'),
      item('pending', 'm4'),
      item('pending', 'm4', 'm5'),
    ]);
    expect(summary.emails).toBe(5);
    expect(batchTitle(summary)).toBe('3 changes · 5 emails');
    expect(batchProgress(summary)).toBe('Waiting for review');
    expect(summary.settled).toBe(false);
  });

  test('reads singular counts naturally', () => {
    expect(batchTitle(summarizeBatch([item('pending', 'm1')]))).toBe('1 change · 1 email');
  });

  test('reports progress while some are decided', () => {
    expect(batchProgress(summarizeBatch([item('approved', 'a'), item('pending', 'b')]))).toBe(
      '1 of 2 decided'
    );
    expect(batchProgress(summarizeBatch([item('working', 'a'), item('pending', 'b')]))).toBe(
      'Applying…'
    );
  });

  test('says how it ended', () => {
    expect(batchProgress(summarizeBatch([item('approved', 'a'), item('approved', 'b')]))).toBe(
      'All applied'
    );
    expect(batchProgress(summarizeBatch([item('rejected', 'a'), item('rejected', 'b')]))).toBe(
      'All rejected'
    );
    const mixed = summarizeBatch([
      item('approved', 'a'),
      item('rejected', 'b'),
      item('failed', 'c'),
    ]);
    expect(mixed.settled).toBe(true);
    expect(batchProgress(mixed)).toBe('1 applied · 1 rejected · 1 failed');
  });
});
