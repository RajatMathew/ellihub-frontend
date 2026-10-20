import type { UIMessage } from 'ai';
import { describe, expect, test } from 'bun:test';

import {
  describeCard,
  FOLLOW_UP_TURNS,
  followUpAnchor,
  toFollowUps,
  toFollowUpTurns,
} from '../src/mock/agent-follow-up-chips';

/**
 * Follow-up chips (elli-ui#1035): what Elliot's next-message suggestions are
 * read from, when they are asked for, and what of the answer is shown.
 */

const message = (id: string, role: 'user' | 'assistant', parts: unknown[]): UIMessage =>
  ({ id, role, parts }) as unknown as UIMessage;
const text = (value: string) => ({ type: 'text', text: value });
const replyCard = (state: string, output?: string) => ({
  type: 'tool-proposeEmailAction',
  toolCallId: 'r1',
  state,
  input: {
    action: 'reply',
    summary: 'Reply to Mike at ACME Steel',
    body: 'Hi Mike,\n\nCould you confirm the 6-week lead time?',
  },
  output,
});

describe('a card, as the model reads it', () => {
  test('a reply waiting for approval carries its draft, so edits are not repeats', () => {
    const line = describeCard(replyCard('input-available'))!;
    expect(line).toContain('Reply to Mike at ACME Steel — waiting for the user to approve');
    expect(line).toContain('Could you confirm the 6-week lead time?');
  });

  test('says where a decided card stands', () => {
    expect(describeCard(replyCard('output-available', 'SUCCESS: sent'))).toContain(
      'approved it and it was done'
    );
    expect(describeCard(replyCard('output-available', 'REJECTED: no'))).toContain(
      'the user rejected it'
    );
    expect(describeCard(replyCard('output-error'))).toContain('it failed');
  });

  test('a lookup is not a card', () => {
    expect(describeCard({ type: 'tool-lookupProjects', state: 'output-available' })).toBeNull();
  });
});

describe('the turns sent', () => {
  test('are plain text, oldest first, with cards in line and empty turns dropped', () => {
    const turns = toFollowUpTurns([
      message('u1', 'user', [text('Draft a reply')]),
      message('a1', 'assistant', [
        { type: 'step-start' },
        { type: 'reasoning', text: 'thinking…' },
        text('Here is a draft.'),
        replyCard('input-available'),
      ]),
      message('a2', 'assistant', [{ type: 'step-start' }]),
    ]);
    expect(turns.map((turn) => turn.role)).toEqual(['user', 'assistant']);
    expect(turns[1]!.text).toStartWith('Here is a draft.\n[Card proposed:');
    expect(turns[1]!.text).not.toContain('thinking');
  });

  test('stop at the last few turns', () => {
    const many = Array.from({ length: 20 }, (_, index) =>
      message(`m${index}`, index % 2 ? 'assistant' : 'user', [text(`turn ${index}`)])
    );
    const turns = toFollowUpTurns(many);
    expect(turns).toHaveLength(FOLLOW_UP_TURNS);
    expect(turns.at(-1)!.text).toBe('turn 19');
  });
});

describe('when chips are asked for', () => {
  const chat = [
    message('u1', 'user', [text('Summarise this')]),
    message('a1', 'assistant', [text('- Invoice #4411 for $12,500')]),
  ];

  test('only once Elliot has finished an answer', () => {
    expect(followUpAnchor('ready', chat)).not.toBeNull();
    expect(followUpAnchor('streaming', chat)).toBeNull();
    expect(followUpAnchor('submitted', chat)).toBeNull();
    expect(followUpAnchor('error', chat)).toBeNull();
  });

  test('not while the chat ends with the reader, or is empty', () => {
    expect(followUpAnchor('ready', [])).toBeNull();
    expect(followUpAnchor('ready', [chat[0]!])).toBeNull();
    expect(followUpAnchor('ready', [chat[0]!, message('a1', 'assistant', [])])).toBeNull();
  });

  test('asked again when deciding a card carries on in the same message', () => {
    // Approving makes Elliot continue the same assistant message, so its id
    // alone would keep the chips offered for "waiting for approval".
    const waiting = message('a1', 'assistant', [text('Draft:'), replyCard('input-available')]);
    const approved = message('a1', 'assistant', [
      text('Draft:'),
      replyCard('output-available', 'SUCCESS: sent'),
      { type: 'step-start' },
      text('Sent.'),
    ]);
    expect(followUpAnchor('ready', [chat[0]!, waiting])).not.toBe(
      followUpAnchor('ready', [chat[0]!, approved])
    );
  });
});

describe('what of the answer is shown', () => {
  test('at most three distinct chips', () => {
    expect(toFollowUps({ followUps: ['A', ' A ', 'B', '', 'C', 'D'] })).toEqual(['A', 'B', 'C']);
  });

  test('anything else is none', () => {
    expect(toFollowUps(null)).toEqual([]);
    expect(toFollowUps({ followUps: 'Make it shorter' })).toEqual([]);
  });
});
