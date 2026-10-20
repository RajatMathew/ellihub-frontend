import type { UIMessage } from 'ai';
import { describe, expect, test } from 'bun:test';

import { agentCardStatus } from '../src/mock/agent-card-status';
import { describeAgentChatError } from '../src/mock/agent-chat-error';
import {
  elliotAskedQuestion,
  failedMessageCoversPendingCard,
  isEmailRequest,
  isReviseOutput,
  needsAThread,
  queueStep,
  sendBlockedReason,
  shouldShowThinkingIndicator,
  withPendingRevised,
} from '../src/mock/agent-send-rules';
import { parseCardNumber } from '../src/mock/card-number';
import {
  isQuoteEdit,
  quoteActionBlocker,
  quoteAttachmentIds,
} from '../src/mock/quote-action-rules';
import {
  formatRecipients,
  isMailActionReady,
  replyActionBlocker,
} from '../src/mock/reply-action-rules';

describe('Elliot chat errors', () => {
  test('names a signed-out request instead of blaming the agent configuration', () => {
    // What the AI SDK transport throws for a 401: the raw response body.
    expect(describeAgentChatError(new Error('{"error":"Unauthorized"}'))).toBe(
      'Elliot could not confirm you are signed in. Refresh the page or sign in again.'
    );
  });

  test('tells a user without assistant access to ask an admin', () => {
    expect(describeAgentChatError(new Error('{"error":"Forbidden"}'))).toContain('Ask an admin');
  });

  test('reports an unreachable server as a connection problem', () => {
    expect(describeAgentChatError(new Error('Failed to fetch'))).toContain('could not reach');
  });

  test('passes a server error through when there is one', () => {
    expect(describeAgentChatError(new Error('{"error":"Model quota exceeded"}'))).toBe(
      'Elliot could not complete that request: Model quota exceeded'
    );
  });

  test('falls back to a plain message for an unreadable body', () => {
    expect(describeAgentChatError(new Error('<html>502</html>'))).toBe(
      'Elliot could not complete that request. Try again in a moment.'
    );
    expect(describeAgentChatError(undefined)).toBe(
      'Elliot could not complete that request. Try again in a moment.'
    );
  });
});

describe('Elliot card status', () => {
  test('an approval in flight reads as working before the tool part changes', () => {
    expect(agentCardStatus({ state: 'input-available', processing: true })).toBe('working');
  });

  test('a rejected output collapses to the rejected chip, anything else to approved', () => {
    expect(
      agentCardStatus({
        state: 'output-available',
        output: 'REJECTED: No RFQ was created.',
        processing: false,
      })
    ).toBe('rejected');
    expect(
      agentCardStatus({
        state: 'output-available',
        output: 'SUCCESS: PO created.',
        processing: false,
      })
    ).toBe('approved');
  });

  test('a failed save is failed, not pending, so its buttons do not come back', () => {
    expect(agentCardStatus({ state: 'output-error', processing: false })).toBe('failed');
  });

  test('a card still waiting for the user is pending', () => {
    expect(agentCardStatus({ state: 'input-available', processing: false })).toBe('pending');
  });
});

describe('Elliot reply card', () => {
  test('an empty To is allowed, because the reply goes back to the sender', () => {
    expect(replyActionBlocker({ to: [], cc: [] })).toBeNull();
    expect(replyActionBlocker({})).toBeNull();
  });

  test('blocks a half-typed address before it reaches the server', () => {
    expect(replyActionBlocker({ to: [{ address: 'dana@hudson' }] })).toBe(
      "To has an address that isn't valid: dana@hudson"
    );
    expect(
      replyActionBlocker({
        to: [{ address: 'dana@hudsonmillwork.com' }],
        cc: [{ address: 'pm' }],
      })
    ).toBe("Cc has an address that isn't valid: pm");
  });

  test('shows named recipients the way they were written', () => {
    expect(
      formatRecipients([
        { address: 'dana@hudsonmillwork.com', name: 'Dana Ruiz' },
        { address: 'pm@brookfieldnyc.com' },
      ])
    ).toBe('Dana Ruiz <dana@hudsonmillwork.com>, pm@brookfieldnyc.com');
  });
});

describe('card number inputs', () => {
  test('reads thousands separators and treats blank or junk as 0', () => {
    expect(parseCardNumber('18,400.00')).toBe(18400);
    expect(parseCardNumber('')).toBe(0);
    expect(parseCardNumber('abc')).toBe(0);
  });
});

describe('a streaming email proposal', () => {
  test('is not drawn until its action type has arrived', () => {
    // A reply draft streams its summary and body before the card can read
    // `action`; drawing it then crashed the page reading the title.
    expect(isMailActionReady({ summary: 'Drafting a reply' } as { action?: string })).toBe(false);
    expect(isMailActionReady(undefined)).toBe(false);
    expect(isMailActionReady({ action: 'repl' })).toBe(false);
    expect(isMailActionReady({ action: 'reply' })).toBe(true);
  });
});

describe('Elliot quote card, add and edit in one', () => {
  const onFile = [{ fileId: 'Fil00001', fileName: 'Hudson_Q-2291.pdf' }];

  test('editing a submitted quote keeps its files: none has to be re-attached', () => {
    expect(
      quoteActionBlocker({
        mode: 'edit',
        quotedAmount: 48250,
        hasNewAttachment: false,
        existingAttachments: onFile,
      })
    ).toBeNull();
  });

  test('a new quote still needs a file and an amount', () => {
    expect(quoteActionBlocker({ quotedAmount: 48250, hasNewAttachment: false })).toBe(
      'Attach the quote document before adding it.'
    );
    expect(quoteActionBlocker({ quotedAmount: null, hasNewAttachment: true })).toBe(
      'Enter a quoted amount greater than 0.'
    );
  });

  test('saving an edit sends the files already on the quote back with a new one', () => {
    // The edit route replaces the quote's files; leaving these out deletes them.
    expect(quoteAttachmentIds(onFile, 'Fil00002')).toEqual(['Fil00001', 'Fil00002']);
    expect(quoteAttachmentIds(onFile, null)).toEqual(['Fil00001']);
    expect(quoteAttachmentIds(onFile, 'Fil00001')).toEqual(['Fil00001']);
    expect(quoteAttachmentIds(undefined, 'Fil00002')).toEqual(['Fil00002']);
  });

  test('only an explicit edit is an edit; an older proposal without mode is a new quote', () => {
    expect(isQuoteEdit({ mode: 'edit' })).toBe(true);
    expect(isQuoteEdit({})).toBe(false);
  });
});

describe('Elliot reply Bcc', () => {
  test('a bad Bcc address blocks the send like To and Cc do', () => {
    expect(replyActionBlocker({ bcc: [{ address: 'finance@' }] })).toBe(
      "Bcc has an address that isn't valid: finance@"
    );
  });
});

describe('sending while a card waits', () => {
  const user = (id: string): UIMessage => ({
    id,
    role: 'user',
    parts: [{ type: 'text', text: 'hi' }],
  });
  const pendingCard: UIMessage = {
    id: 'a1',
    role: 'assistant',
    parts: [
      { type: 'text', text: 'I drafted a reply.' },
      {
        type: 'tool-proposeEmailAction',
        toolCallId: 't1',
        state: 'input-available',
        input: {},
      } as never,
    ],
  };
  const decidedCard: UIMessage = {
    ...pendingCard,
    parts: [
      {
        type: 'tool-proposeEmailAction',
        toolCallId: 't1',
        state: 'output-available',
        input: {},
        output: 'ok',
      } as never,
    ],
  };

  test('is blocked until the card is approved or rejected', () => {
    expect(sendBlockedReason('ready', pendingCard)).toBe(
      'Approve or reject the pending action first.'
    );
    expect(sendBlockedReason('ready', decidedCard)).toBeNull();
    expect(sendBlockedReason('ready', undefined)).toBeNull();
  });

  test('is blocked while Elliot is working, whatever the last message is', () => {
    expect(sendBlockedReason('streaming', decidedCard)).toBe('Elliot is still working.');
    expect(sendBlockedReason('submitted', undefined)).toBe('Elliot is still working.');
  });

  test('a failed message sent over a pending card can be dropped to free the card', () => {
    expect(failedMessageCoversPendingCard([user('u1'), pendingCard, user('u2')])).toBe(true);
    expect(failedMessageCoversPendingCard([user('u1'), decidedCard, user('u2')])).toBe(false);
    expect(failedMessageCoversPendingCard([user('u1'), pendingCard])).toBe(false);
  });
});

describe('typing while a card waits', () => {
  const pending: UIMessage = {
    id: 'a1',
    role: 'assistant',
    parts: [
      { type: 'text', text: 'Here is a draft.' },
      {
        type: 'tool-proposeEmailAction',
        toolCallId: 't1',
        state: 'input-available',
        input: {},
      } as never,
      {
        type: 'tool-proposeEmailAction',
        toolCallId: 't2',
        state: 'input-available',
        input: {},
      } as never,
    ],
  };

  test('answers every waiting card with the request, so Elliot can revise', () => {
    const [turn] = withPendingRevised([pending], 'make it shorter');
    const tools = turn!.parts.filter((part) => part.type.startsWith('tool-')) as Array<{
      state: string;
      output: string;
    }>;
    expect(tools.map((part) => part.state)).toEqual(['output-available', 'output-available']);
    expect(tools.map((part) => part.output)).toEqual([
      'REVISE: make it shorter',
      'REVISE: make it shorter',
    ]);
    expect(isReviseOutput(tools[0]!.output)).toBe(true);
  });

  test('leaves a conversation with nothing waiting alone', () => {
    const user: UIMessage = { id: 'u', role: 'user', parts: [{ type: 'text', text: 'hi' }] };
    expect(withPendingRevised([pending, user], 'shorter')).toEqual([pending, user]);
  });
});

describe('"all of them", one thread at a time', () => {
  const user: UIMessage = { id: 'u', role: 'user', parts: [{ type: 'text', text: 'archive' }] };
  const card = (state: string): UIMessage => ({
    id: 'a',
    role: 'assistant',
    parts: [{ type: 'tool-proposeEmailAction', toolCallId: 't', state, input: {} } as never],
  });
  const done: UIMessage = {
    id: 'd',
    role: 'assistant',
    parts: [{ type: 'text', text: 'Archived.' }],
  };
  const queue = {
    label: 'archive',
    template: 'archive (about {email})',
    threadIds: ['a', 'b', 'c'],
    index: 0,
    sentAt: 0,
  };

  test('waits while Elliot works, while a card is undecided, and before its turn lands', () => {
    expect(queueStep(queue, 'streaming', [user, card('input-available')])).toBe('wait');
    expect(queueStep(queue, 'ready', [user, card('input-available')])).toBe('wait');
    expect(queueStep(queue, 'ready', [user])).toBe('wait');
    expect(queueStep({ ...queue, sentAt: 2 }, 'ready', [user, done])).toBe('wait');
  });

  test('moves to the next thread once the current one is decided and answered', () => {
    expect(queueStep(queue, 'ready', [user, card('output-available'), done])).toBe('advance');
    expect(queueStep({ ...queue, index: 2 }, 'ready', [user, card('output-available'), done])).toBe(
      'done'
    );
  });
});

describe('what typed text is', () => {
  const asked: UIMessage = {
    id: 'q',
    role: 'assistant',
    parts: [{ type: 'text', text: 'Could you clarify what you would like me to do with it?' }],
  };
  const told: UIMessage = {
    id: 't',
    role: 'assistant',
    parts: [{ type: 'text', text: 'Archived.' }],
  };

  test('a request about mail asks which email when several are in context', () => {
    expect(isEmailRequest('archive', told)).toBe(true);
    expect(isEmailRequest('draft a short reply', undefined)).toBe(true);
  });

  test('an answer to a question Elliot just asked is not a new request', () => {
    expect(isEmailRequest('archive', asked)).toBe(false);
    expect(elliotAskedQuestion(asked)).toBe(true);
    expect(elliotAskedQuestion(told)).toBe(false);
  });

  test('small talk and one-word answers are not requests', () => {
    for (const text of ['all', 'ok', 'Yes.', 'thanks', 'go ahead', 'never mind']) {
      expect(isEmailRequest(text, told)).toBe(false);
    }
  });

  test('a message that names a thread with @ is already specific', () => {
    expect(isEmailRequest('reply to @Quote Q-2291', told)).toBe(false);
  });
});

describe('a mail request with nothing attached', () => {
  test('asks for a thread instead of letting Elliot pick one from earlier in the chat', () => {
    expect(needsAThread('reply', 0)).toBe(true);
    expect(needsAThread('archive it', 0)).toBe(true);
    expect(needsAThread('summarise this', 0)).toBe(true);
  });

  test('lets general questions and attached threads through', () => {
    expect(needsAThread('which RFQs are waiting on quotes?', 0)).toBe(false);
    expect(needsAThread('reply', 1)).toBe(false);
    expect(needsAThread('reply to @Quote Q-2291', 0)).toBe(false);
  });
});

// The "thinking" line under Elliot's chat: shown until the turn in progress has
// something of its own on screen.

const assistant = (parts: unknown[]): UIMessage =>
  ({ id: 'm1', role: 'assistant', parts }) as unknown as UIMessage;

const lookup = (state: string) => ({
  type: 'tool-lookupPurchaseOrders',
  toolCallId: `po-${state}`,
  state,
  input: { query: 'Atlantic Plywood' },
  ...(state === 'output-available' ? { output: [] } : {}),
});

const question = (state: string) => ({
  type: 'tool-askUser',
  toolCallId: 'q1',
  state,
  input: { question: 'Which purchase order?', options: [{ label: 'PO-26042' }] },
  ...(state === 'output-available' ? { output: 'ANSWER: PO-26042' } : {}),
});

const show = (message: UIMessage, status: 'streaming' | 'submitted' = 'streaming') =>
  shouldShowThinkingIndicator({ status, messages: [message] });

describe('the thinking line after the reader answers', () => {
  test('stays while Elliot picks the task back up after a question was answered', () => {
    // The answer carries the same message on: the lookups and question above it
    // are already on screen, and nothing new has arrived yet.
    const message = assistant([
      lookup('output-available'),
      { type: 'text', text: 'PO 26840 does not exist.' },
      question('output-available'),
    ]);
    expect(show(message)).toBe(true);
  });

  test('stays after an approved card while Elliot carries on', () => {
    const message = assistant([
      { type: 'text', text: 'Here is the invoice.' },
      {
        type: 'tool-proposeRecordAction',
        toolCallId: 'r1',
        state: 'output-available',
        output: 'SUCCESS: logged',
      },
    ]);
    expect(show(message)).toBe(true);
  });

  test('gives way to the new lookup timeline once Elliot starts one', () => {
    const message = assistant([question('output-available'), lookup('input-available')]);
    expect(show(message)).toBe(false);
  });

  test('gives way to the first words of the reply', () => {
    const message = assistant([
      question('output-available'),
      { type: 'text', text: 'Logging it against PO-26042.' },
    ]);
    expect(show(message)).toBe(false);
  });
});

describe('the thinking line in a fresh turn', () => {
  test('shows while the request is in flight', () => {
    expect(show(assistant([]), 'submitted')).toBe(true);
  });

  test('gives way to a lookup timeline, then stays gone', () => {
    expect(show(assistant([lookup('input-available')]))).toBe(false);
  });

  test('stays hidden once a question is waiting on the reader', () => {
    expect(show(assistant([question('input-available')]))).toBe(false);
  });

  test('never shows once the turn is over', () => {
    expect(shouldShowThinkingIndicator({ status: 'ready', messages: [] })).toBe(false);
  });
});
