import type { UIMessage } from 'ai';
import { describe, expect, test } from 'bun:test';

import { groupActivitySteps } from '../src/mock/agent-activity';
import { followUpAnchor } from '../src/mock/agent-follow-up-chips';
import {
  answerOutput,
  confirmableAnswer,
  pendingQuestion,
  readAnswer,
  readQuestion,
  splitFileNames,
} from '../src/mock/agent-question';
import { sendBlockedReason } from '../src/mock/agent-send-rules';

const assistant = (parts: unknown[]): UIMessage =>
  ({ id: 'm1', role: 'assistant', parts }) as unknown as UIMessage;

const question = (state: string, output?: string) => ({
  type: 'tool-askUser',
  toolCallId: 'q1',
  state,
  input: {
    question: 'Which RFQ is the quote for?',
    options: [
      { label: 'RFQ-28100-25-002', detail: 'Casework & millwork – exam rooms' },
      { label: '  ' },
    ],
  },
  ...(output === undefined ? {} : { output }),
});

describe("Elliot's mid-task question (elli-ui#1368)", () => {
  test('an unanswered question is what the next thing typed answers', () => {
    const message = assistant([
      { type: 'text', text: 'No RFQ-0142.' },
      question('input-available'),
    ]);
    expect(pendingQuestion(message)?.toolCallId).toBe('q1');
  });

  test('an answered question no longer waits', () => {
    const message = assistant([question('output-available', answerOutput('RFQ-28100-25-002'))]);
    expect(pendingQuestion(message)).toBeNull();
    expect(readAnswer(message.parts[0] as never)).toBe('RFQ-28100-25-002');
  });

  test('the answer goes back trimmed, under a prefix the prompt names', () => {
    expect(answerOutput('  Hudson Millwork  ')).toBe('ANSWER: Hudson Millwork');
  });

  test('options without a label are dropped while the input streams', () => {
    expect(readQuestion(question('input-streaming').input)).toEqual({
      question: 'Which RFQ is the quote for?',
      options: [{ label: 'RFQ-28100-25-002', detail: 'Casework & millwork – exam rooms' }],
    });
    expect(readQuestion({ options: [] })).toBeNull();
  });

  test('a question is a card, not a lookup step, and it ends the run before it', () => {
    const groups = groupActivitySteps(
      assistant([
        {
          type: 'tool-lookupRfqs',
          toolCallId: 'a',
          state: 'output-available',
          output: { rfqs: [] },
        },
        question('input-available'),
      ])
    );
    expect(groups.map((group) => group.steps.map((step) => step.id))).toEqual([['a']]);
    expect(groups[0]!.trailing).toBe(false);
  });

  test('suggestion chips stay away while a question is open', () => {
    const message = assistant([
      { type: 'text', text: 'No RFQ-0142.' },
      question('input-available'),
    ]);
    expect(followUpAnchor('ready', [message])).toBeNull();
    expect(sendBlockedReason('ready', message)).toBe('Answer Elliot’s question first.');
  });
});

describe('a pick waits for Confirm (elli-ui#1462)', () => {
  const asked = readQuestion({
    question: 'What is the invoice total?',
    options: [{ label: '$36.90, due on receipt' }, { label: "I'll type the amount" }],
  });

  test('nothing is sent until an option is selected', () => {
    expect(confirmableAnswer(asked, null)).toBeNull();
  });

  test('Confirm sends the selected option', () => {
    expect(confirmableAnswer(asked, '$36.90, due on receipt')).toBe('$36.90, due on receipt');
  });

  test('a selection no longer offered sends nothing', () => {
    expect(confirmableAnswer(asked, 'Net 30')).toBeNull();
    expect(confirmableAnswer(null, '$36.90, due on receipt')).toBeNull();
  });
});

describe('splitFileNames', () => {
  test('pulls a long attachment name out of the question with its extension kept apart', () => {
    expect(
      splitFileNames(
        'What is the total amount on this invoice (00ELLI002_SO_1211231IN_20261014_000.PDF)?'
      )
    ).toEqual([
      { kind: 'text', text: 'What is the total amount on this invoice (' },
      {
        kind: 'file',
        text: '00ELLI002_SO_1211231IN_20261014_000.PDF',
        stem: '00ELLI002_SO_1211231IN_20261014_000',
        extension: '.PDF',
      },
      { kind: 'text', text: ')?' },
    ]);
  });

  test('leaves a sentence-ending period and amounts as text', () => {
    expect(splitFileNames('Total is 36.90, see quote.pdf.')).toEqual([
      { kind: 'text', text: 'Total is 36.90, see ' },
      { kind: 'file', text: 'quote.pdf', stem: 'quote', extension: '.pdf' },
      { kind: 'text', text: '.' },
    ]);
  });

  test('returns plain text untouched when there is no file name', () => {
    expect(splitFileNames('Which RFQ, e.g. the latest?')).toEqual([
      { kind: 'text', text: 'Which RFQ, e.g. the latest?' },
    ]);
  });
});
