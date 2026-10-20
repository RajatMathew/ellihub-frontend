import { describe, expect, test } from 'bun:test';

import { fitTextareaHeight } from '../src/app/hooks/use-auto-height';

/**
 * The description box in the task and event modals sat three lines tall under a
 * one-line placeholder: `rows={3}` plus a min-height, and `field-sizing:
 * content`, which only Chromium honours. It is now measured to its content.
 */

function textarea(scrollHeight: number) {
  const style: Record<string, string> = {};
  const element = {
    style,
    get scrollHeight() {
      // A box reports its content's height only once its own height is cleared.
      return style.height === 'auto' ? scrollHeight : Math.max(scrollHeight, 0);
    },
  };
  return element as unknown as HTMLTextAreaElement & { style: Record<string, string> };
}

describe('fitTextareaHeight', () => {
  test('is as tall as its content', () => {
    const element = textarea(24);
    fitTextareaHeight(element, 320);
    expect(element.style.height).toBe('24px');
    expect(element.style.overflowY).toBe('hidden');
  });

  test('stops at the cap and scrolls from there', () => {
    const element = textarea(900);
    fitTextareaHeight(element, 320);
    expect(element.style.height).toBe('320px');
    expect(element.style.overflowY).toBe('auto');
  });

  test('shrinks again when text is deleted', () => {
    const element = textarea(24);
    element.style.height = '200px';
    fitTextareaHeight(element, 320);
    expect(element.style.height).toBe('24px');
  });
});
