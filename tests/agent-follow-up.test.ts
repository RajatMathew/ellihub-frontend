import type { UIMessage } from 'ai';
import { describe, expect, test } from 'bun:test';

import { getSilencedTextParts } from '../src/mock/agent-follow-up';

const assistant = (parts: unknown[]): UIMessage =>
  ({ id: 'a', role: 'assistant', parts }) as unknown as UIMessage;

const reply = (state: string, output?: string) => ({
  type: 'tool-proposeEmailAction',
  toolCallId: 'r1',
  state,
  output,
});

describe('Elliot follow-up after a decided card', () => {
  test('does not repeat an approved reply under its card', () => {
    // The turn as it was saved: approve, then the model restated the draft.
    const message = assistant([
      { type: 'step-start' },
      { type: 'reasoning', text: '…' },
      reply('output-available', 'SUCCESS: Reply sent successfully.'),
      { type: 'step-start' },
      { type: 'text', text: "Here's a suggested reply: … The draft is ready for your review." },
    ]);
    expect([...getSilencedTextParts(message)]).toEqual([4]);
  });

  test('a rejected card is silenced the same way', () => {
    const message = assistant([
      { type: 'step-start' },
      reply('output-available', 'REJECTED: No mailbox change was made.'),
      { type: 'step-start' },
      { type: 'text', text: 'Okay, I left it alone.' },
    ]);
    expect([...getSilencedTextParts(message)]).toEqual([3]);
  });

  test('keeps what Elliot wrote before the card, in the proposing step', () => {
    const message = assistant([
      { type: 'step-start' },
      { type: 'text', text: 'Here is a draft for you to check.' },
      reply('output-available', 'SUCCESS: Reply sent successfully.'),
    ]);
    expect(getSilencedTextParts(message).size).toBe(0);
  });

  test('keeps the text while the card is still waiting for a decision', () => {
    const message = assistant([
      { type: 'step-start' },
      reply('input-available'),
      { type: 'text', text: 'Approve when ready.' },
    ]);
    expect(getSilencedTextParts(message).size).toBe(0);
  });

  test('keeps the explanation when the action failed', () => {
    const message = assistant([
      { type: 'step-start' },
      { ...reply('output-error'), errorText: 'The reply failed.' },
      { type: 'step-start' },
      { type: 'text', text: 'The send failed because the mailbox needs reconnecting.' },
    ]);
    expect(getSilencedTextParts(message).size).toBe(0);
  });

  test('silences only the step right after the decision', () => {
    const message = assistant([
      { type: 'step-start' },
      reply('output-available', 'SUCCESS: Reply sent successfully.'),
      { type: 'step-start' },
      { type: 'text', text: 'Sent.' },
      { type: 'tool-lookupProjects', toolCallId: 'l', state: 'output-available', output: {} },
      { type: 'step-start' },
      { type: 'text', text: 'Found the project you asked about.' },
    ]);
    expect([...getSilencedTextParts(message)]).toEqual([3]);
  });

  test('keeps the text of a follow-up that proposes something new', () => {
    // After a rejection Elliot found what it had missed and proposed again;
    // its line introduces the new cards and must stay.
    const message = assistant([
      { type: 'step-start' },
      reply('output-available', 'REJECTED: No mailbox change was made.'),
      { type: 'step-start' },
      { type: 'text', text: 'Found it. Proposing both actions together' },
      { type: 'tool-proposeEmailAction', toolCallId: 'b1', state: 'input-available' },
      { type: 'tool-proposeEmailAction', toolCallId: 'b2', state: 'input-available' },
    ]);
    expect(getSilencedTextParts(message).size).toBe(0);
  });

  test('covers schedule, RFQ and record cards, not only mail', () => {
    for (const tool of [
      'proposeProjectScheduleAction',
      'proposeUploadRfqQuote',
      'proposeRecordAction',
    ]) {
      const message = assistant([
        { type: 'step-start' },
        {
          type: `tool-${tool}`,
          toolCallId: 't',
          state: 'output-available',
          output: 'SUCCESS: Done.',
        },
        { type: 'step-start' },
        { type: 'text', text: 'Done.' },
      ]);
      expect([...getSilencedTextParts(message)]).toEqual([3]);
    }
  });

  test("a lookup's result never silences anything", () => {
    const message = assistant([
      { type: 'step-start' },
      { type: 'tool-lookupRfqs', toolCallId: 'l', state: 'output-available', output: 'SUCCESS' },
      { type: 'step-start' },
      { type: 'text', text: 'Here are the RFQs.' },
    ]);
    expect(getSilencedTextParts(message).size).toBe(0);
  });

  test('user messages are never touched', () => {
    const message = { id: 'u', role: 'user', parts: [{ type: 'text', text: 'hi' }] };
    expect(getSilencedTextParts(message as unknown as UIMessage).size).toBe(0);
  });
});
