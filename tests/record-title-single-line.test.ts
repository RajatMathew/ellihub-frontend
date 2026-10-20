import { describe, expect, test } from 'bun:test';

import { toSingleLine } from '../src/app/components/record-modal/single-line';

/**
 * The New Task / New Event title wraps instead of scrolling sideways (a long title, such as a
 * task Elliot drafted, opened showing only its tail). It must stay one line of text.
 */
describe('a record title', () => {
  test('turns a pasted line break into a space', () => {
    expect(toSingleLine('Revise shop drawings\nfor PS 082K')).toBe(
      'Revise shop drawings for PS 082K'
    );
  });

  test('collapses a Windows break, or several, into one space', () => {
    expect(toSingleLine('Confirm award\r\n\r\nby Oct 15')).toBe('Confirm award by Oct 15');
  });

  test('leaves a one-line title alone', () => {
    expect(toSingleLine('Download updated drawings')).toBe('Download updated drawings');
  });
});
