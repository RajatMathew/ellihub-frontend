import { describe, expect, test } from 'bun:test';

import {
  FINISHED_CATCH_UP_MS,
  MIN_CHARS_PER_SECOND,
  nextRevealLength,
  splitMarkdownBlocks,
  splitWords,
  STREAMING_CATCH_UP_MS,
  wholeWordsOf,
} from '../src/mock/agent-stream-text';

const FRAME = 16;

/** Frames until the reveal reaches `target`, starting from `shown`. */
function framesToReveal(shown: number, target: number, streaming: boolean) {
  let frames = 0;
  let current = shown;
  while (current < target && frames < 10_000) {
    current = nextRevealLength({ shown: current, target, elapsedMs: FRAME, streaming });
    frames += 1;
  }
  return frames;
}

describe('Elliot streaming reveal pacing', () => {
  test('spreads a burst over several frames instead of painting it at once', () => {
    // A 40-character burst — the lurch #1343 is about.
    const first = nextRevealLength({ shown: 0, target: 40, elapsedMs: FRAME, streaming: true });
    expect(first).toBeGreaterThan(0);
    expect(first).toBeLessThan(40);
    expect(framesToReveal(0, 40, true)).toBeGreaterThan(3);
  });

  test('halves any backlog within the catch-up window, however large', () => {
    // The lag the reader sees is bounded in time, not in characters.
    for (const backlog of [200, 2_000, 20_000]) {
      let shown = 0;
      for (let elapsed = 0; elapsed < STREAMING_CATCH_UP_MS; elapsed += FRAME) {
        shown = nextRevealLength({ shown, target: backlog, elapsedMs: FRAME, streaming: true });
      }
      expect(shown).toBeGreaterThanOrEqual(backlog / 2);
    }
  });

  test('keeps at least a steady reading pace for a small backlog', () => {
    const next = nextRevealLength({ shown: 0, target: 2, elapsedMs: 1000, streaming: true });
    // One long frame is clamped, but still moves.
    expect(next).toBeGreaterThan(0);
    const oneSecondOfFrames = Math.ceil(1000 / FRAME);
    let shown = 0;
    for (let i = 0; i < oneSecondOfFrames; i += 1) {
      shown = nextRevealLength({ shown, target: 10_000, elapsedMs: FRAME, streaming: true });
    }
    expect(shown).toBeGreaterThanOrEqual(MIN_CHARS_PER_SECOND);
  });

  test('drains what is left quickly once the stream ends', () => {
    const streaming = framesToReveal(0, 600, true);
    const finished = framesToReveal(0, 600, false);
    expect(finished).toBeLessThan(streaming);
    // A long answer that arrived in one last burst is on screen within ~a quarter second.
    expect(finished * FRAME).toBeLessThanOrEqual(FINISHED_CATCH_UP_MS * 4);
  });

  test('always moves at least one character while text is waiting', () => {
    expect(nextRevealLength({ shown: 5, target: 6, elapsedMs: 0, streaming: true })).toBe(6);
  });

  test('never runs past the text it was given', () => {
    expect(nextRevealLength({ shown: 9, target: 10, elapsedMs: 64, streaming: false })).toBe(10);
  });

  test('shows a shorter replacement text as it is', () => {
    // A regenerated reply can be shorter than what was on screen.
    expect(nextRevealLength({ shown: 120, target: 30, elapsedMs: FRAME, streaming: true })).toBe(
      30
    );
  });

  test('a background tab does not dump the whole backlog on return', () => {
    const next = nextRevealLength({ shown: 0, target: 5_000, elapsedMs: 30_000, streaming: true });
    expect(next).toBeLessThan(5_000);
  });
});

describe('Elliot markdown blocks', () => {
  test('splits paragraphs, headings and lists at blank lines', () => {
    const text = 'Intro line.\n\n## Breakdown\n\n- one\n- two\n\nClosing.';
    expect(splitMarkdownBlocks(text)).toEqual([
      'Intro line.',
      '## Breakdown',
      '- one\n- two',
      'Closing.',
    ]);
  });

  test('keeps finished blocks identical while the last one grows', () => {
    // Identical strings are what let each finished block keep its memoized render.
    const before = splitMarkdownBlocks('First paragraph.\n\nSecond is being wri');
    const after = splitMarkdownBlocks('First paragraph.\n\nSecond is being written now.');
    expect(after[0]).toBe(before[0]);
    expect(after).toHaveLength(2);
  });

  test('keeps a fenced code block whole across its blank lines', () => {
    const text = 'Run this:\n\n```\nline one\n\nline two\n```\n\nDone.';
    expect(splitMarkdownBlocks(text)).toEqual([
      'Run this:',
      '```\nline one\n\nline two\n```',
      'Done.',
    ]);
  });

  test('keeps an unclosed fence (still streaming) in one block', () => {
    expect(splitMarkdownBlocks('```\na\n\nb')).toEqual(['```\na\n\nb']);
  });

  test('keeps an indented continuation with its list item', () => {
    const text = '1. First step\n\n   more about the first step\n\n2. Second step';
    expect(splitMarkdownBlocks(text)).toEqual([
      '1. First step\n\n   more about the first step',
      '2. Second step',
    ]);
  });

  test('ignores runs of blank lines and surrounding whitespace lines', () => {
    expect(splitMarkdownBlocks('\n\nA\n\n\n\nB\n\n')).toEqual(['A', 'B']);
    expect(splitMarkdownBlocks('')).toEqual([]);
  });
});

describe('wholeWordsOf (elli-ui#1482)', () => {
  test('holds back the word still arriving while the field streams', () => {
    expect(wholeWordsOf('Hi Akash,\nThanks for the upd', true)).toBe('Hi Akash,\nThanks for the ');
  });

  test('a word shows once the space after it has arrived', () => {
    expect(wholeWordsOf('Thanks for ', true)).toBe('Thanks for ');
  });

  test('the first word waits too, so nothing shows half-written', () => {
    expect(wholeWordsOf('Than', true)).toBe('');
  });

  test('once the stream is over the last word shows', () => {
    expect(wholeWordsOf('Thanks,\nMahavir', false)).toBe('Thanks,\nMahavir');
  });
});

describe('splitWords (elli-ui#1482)', () => {
  test('joined, the pieces are the text — line breaks and all', () => {
    const text = '  Hi Akash,\n\n1. PO-25768 – delivered.\n';
    expect(splitWords(text).join('')).toBe(text);
  });

  test('a word keeps the space after it, so a growing gap never re-keys a word', () => {
    expect(splitWords('Hi Akash, ')).toEqual(['Hi ', 'Akash, ']);
  });

  test('empty text has no pieces', () => {
    expect(splitWords('')).toEqual([]);
  });
});
